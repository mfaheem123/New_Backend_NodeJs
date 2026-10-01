const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const MessageModel = require("../models/messageModel"); // Ensure status updates methods in model
const { sendPushNotification } = require("../services/notificationService");
const pool = require("../db"); // PostgreSQL / Database connection

const connectedClients = new Map(); // key: `companyId_role_userId`, value: ws

function handleChatSocket(ws, req) {
  ws.id = uuidv4();

  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const companyId = urlParams.get("company_id");
  const userId = urlParams.get("user_id");
  const role = urlParams.get("role");

  if (!companyId || !userId || !role) {
    logger.warn("Chat WS Rejected: Missing params");
    return ws.close();
  }

  ws.companyId = companyId;
  ws.userId = userId;
  ws.role = role;

  const clientKey = `${companyId}_${role}_${userId}`;
  connectedClients.set(clientKey, ws);

  logger.info(`Chat Socket Connected: ${clientKey}`);

  // 1. ONLINE STATUS BROADCAST
  broadcastPresence(ws.companyId, ws.userId, ws.role, "ONLINE");

  ws.on("message", async (rawMessage) => {
    try {
      const payload = JSON.parse(rawMessage);
      const {
        event,
        receiver_id,
        receiver_role,
        chat_type,
        message_type,
        content,
        message_ids,
        target_role,
        target_id,
      } = payload;

      // =========================================================
      // EVENT 1: SEND_MESSAGE (Text, Image, Audio)
      // =========================================================
      if (event === "send_message" || !event) {
        // Step A: DB me message save karein (Default status: 'SENT' -> Single Tick)
        const savedMessage = await MessageModel.createMessage({
          company_id: ws.companyId,
          sender_id: ws.userId,
          sender_role: ws.role,
          receiver_id: receiver_id || null,
          receiver_role,
          chat_type,
          message_type,
          content,
          status: "SENT",
        });

        // Step B: Sender ko Ack bhein (Single Tick)
        ws.send(
          JSON.stringify({
            event: "message_sent_ack",
            data: {
              message_id: savedMessage.id,
              status: "SENT",
              message: savedMessage,
            },
          }),
        );

        // Step C: Delivery Check
        let isDelivered = false;

        // SCENARIO 1: Receiver CONTROLLER Hai (Broadcast to ALL Controllers of Company)
        if (receiver_role === "CONTROLLER") {
          for (let [key, clientWs] of connectedClients.entries()) {
            if (
              key.startsWith(`${ws.companyId}_CONTROLLER_`) &&
              clientWs.readyState === 1
            ) {
              clientWs.send(
                JSON.stringify({
                  event: "new_message",
                  data: savedMessage,
                }),
              );
              isDelivered = true;
            }
          }
        }
        // SCENARIO 2: Receiver Specific User Hai (ADMIN / DRIVER / CUSTOMER)
        else {
          const receiverKey = `${ws.companyId}_${receiver_role}_${receiver_id}`;
          const targetSocket = connectedClients.get(receiverKey);

          if (targetSocket && targetSocket.readyState === 1) {
            targetSocket.send(
              JSON.stringify({
                event: "new_message",
                data: savedMessage,
              }),
            );
            isDelivered = true;
          }
        }

        // Step D: Agar kam se kam ek target online mila -> Status DELIVERED (Double Tick)
        if (isDelivered) {
          await pool.query(
            `UPDATE chat_messages SET status = 'DELIVERED' WHERE id = $1`,
            [savedMessage.id],
          );

          ws.send(
            JSON.stringify({
              event: "message_status_update",
              data: { message_id: savedMessage.id, status: "DELIVERED" },
            }),
          );
        } else {
          // Push Notification (App Offline / Background)
          await sendPushNotification({
            companyId: ws.companyId,
            userId: receiver_id,
            userRole: receiver_role,
            title: `New Message from ${ws.role}`,
            body: message_type === "text" ? content : `Sent a ${message_type}`,
            data: { chat_type, sender_id: String(ws.userId) },
          });
        }
      }

      // =========================================================
      // EVENT 2: MARK_AS_READ (Blue Tick Update)
      // =========================================================
      else if (event === "mark_as_read") {
        if (Array.isArray(message_ids) && message_ids.length > 0) {
          await pool.query(
            `UPDATE chat_messages SET status = 'READ' WHERE id = ANY($1::int[])`,
            [message_ids],
          );

          // Original Sender ko inform karein (Blue Tick update)
          const senderKey = `${ws.companyId}_${payload.sender_role}_${payload.sender_id}`;
          const senderWs = connectedClients.get(senderKey);

          if (senderWs && senderWs.readyState === 1) {
            senderWs.send(
              JSON.stringify({
                event: "messages_read_ack",
                data: { message_ids, status: "READ" },
              }),
            );
          }
        }
      }

      // =========================================================
      // EVENT 3: TYPING STATUS
      // =========================================================
      else if (event === "typing_start" || event === "typing_stop") {
        const isTyping = event === "typing_start";
        broadcastToTarget(ws.companyId, target_role, target_id, "user_typing", {
          user_id: ws.userId,
          role: ws.role,
          is_typing: isTyping,
        });
      }
    } catch (err) {
      logger.error("WS Message Error:", err);
    }
  });

  ws.on("close", () => {
    connectedClients.delete(clientKey);
    broadcastPresence(ws.companyId, ws.userId, ws.role, "OFFLINE");
    logger.info(`Chat Socket Disconnected: ${clientKey}`);
  });
}

// Helper: Target Controllers ya User ko typing / status notify karne ke liye
function broadcastToTarget(
  companyId,
  targetRole,
  targetId,
  eventName,
  payload,
) {
  if (targetRole === "CONTROLLER") {
    for (let [key, clientWs] of connectedClients.entries()) {
      if (
        key.startsWith(`${companyId}_CONTROLLER_`) &&
        clientWs.readyState === 1
      ) {
        clientWs.send(JSON.stringify({ event: eventName, data: payload }));
      }
    }
  } else {
    const targetKey = `${companyId}_${targetRole}_${targetId}`;
    const targetWs = connectedClients.get(targetKey);
    if (targetWs && targetWs.readyState === 1) {
      targetWs.send(JSON.stringify({ event: eventName, data: payload }));
    }
  }
}

// Helper: Presence (Online/Offline) update
function broadcastPresence(companyId, userId, role, status) {
  const presencePayload = JSON.stringify({
    event: "presence_change",
    data: { user_id: userId, role, status },
  });

  for (let [key, clientWs] of connectedClients.entries()) {
    if (key.startsWith(`${companyId}_`) && clientWs.readyState === 1) {
      clientWs.send(presencePayload);
    }
  }
}

module.exports = { handleChatSocket };
