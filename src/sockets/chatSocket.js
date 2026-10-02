const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const MessageModel = require("../models/messageModel");
const { sendChatMessageNotification } = require("../services/notificationService");
const pool = require("../db");

const connectedClients = new Map(); // key: `${companyId}_${role}_${userId}`

function handleChatSocket(ws, req) {
  ws.id = uuidv4();

  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const companyId = urlParams.get("company_id");
  const userId = urlParams.get("user_id");
  const role = urlParams.get("role"); // 'DRIVER', 'CONTROLLER', 'ADMIN'

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

  // 🔴 1. ONLINE PRESENCE BROADCAST
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
      // EVENT 1: SEND_MESSAGE (Single / Double Tick / Broadcast)
      // =========================================================
      if (event === "send_message" || !event) {
        let senderName = "";
        if (ws.role === "DRIVER") {
          const dRes = await pool.query(`SELECT name FROM drivers WHERE id = $1`, [ws.userId]);
          senderName = dRes.rows[0]?.name || `Driver #${ws.userId}`;
        } else {
          const eRes = await pool.query(`SELECT username FROM employees WHERE id = $1`, [ws.userId]);
          senderName = eRes.rows[0]?.username || `${ws.role} #${ws.userId}`;
        }

        // DB me message save karein (Default status: SENT)
        const savedMessage = await MessageModel.createMessage({
          company_id: ws.companyId,
          sender_id: ws.userId,
          sender_role: ws.role,
          receiver_id: receiver_id || null,
          receiver_role,
          chat_type: chat_type || "DRIVER_CHAT",
          message_type,
          content,
          status: "SENT",
        });

        const messagePayload = {
          ...savedMessage,
          sender_name: senderName,
        };

        // Sender ko Ack bhein (SINGLE TICK ✔️)
        ws.send(
          JSON.stringify({
            event: "message_sent_ack",
            data: { message_id: savedMessage.id, status: "SENT", message: messagePayload },
          })
        );

        let isDelivered = false;

        // Receiver broadcast check (CONTROLLER / ADMIN)
        if (receiver_role === "CONTROLLER" || receiver_role === "ADMIN") {
          for (let [key, clientWs] of connectedClients.entries()) {
            if (
              key.startsWith(`${ws.companyId}_${receiver_role}_`) &&
              clientWs.readyState === 1
            ) {
              clientWs.send(
                JSON.stringify({
                  event: "new_message",
                  data: messagePayload,
                })
              );
              isDelivered = true;
            }
          }
        } else if (receiver_role === "DRIVER") {
          const driverKey = `${ws.companyId}_DRIVER_${receiver_id}`;
          const driverWs = connectedClients.get(driverKey);
          if (driverWs && driverWs.readyState === 1) {
            driverWs.send(
              JSON.stringify({
                event: "new_message",
                data: messagePayload,
              })
            );
            isDelivered = true;
          }
        }

        // DOUBLE TICK CHECK (✔️✔️)
        if (isDelivered) {
          await pool.query(
            `UPDATE messages SET is_read = FALSE WHERE id = $1`, // DB status track
            [savedMessage.id]
          );

          ws.send(
            JSON.stringify({
              event: "message_status_update",
              data: { message_id: savedMessage.id, status: "DELIVERED" },
            })
          );
        } else {
          // Push Notification agar offline ho
          await sendChatMessageNotification({
            companyId: ws.companyId,
            receiverId: receiver_id,
            receiverRole,
            senderId: ws.userId,
            senderRole: ws.role,
            messageType,
            content,
            chatType,
          });
        }
      }

      // =========================================================
      // EVENT 2: MARK_AS_READ (BLUE TICK ✔️✔️)
      // =========================================================
      else if (event === "mark_as_read") {
        if (Array.isArray(message_ids) && message_ids.length > 0) {
          await pool.query(
            `UPDATE messages SET is_read = TRUE WHERE id = ANY($1::int[])`,
            [message_ids]
          );

          // Original Sender ko Blue Tick ack bhejein
          const senderKey = `${ws.companyId}_${payload.sender_role}_${payload.sender_id}`;
          const senderWs = connectedClients.get(senderKey);

          if (senderWs && senderWs.readyState === 1) {
            senderWs.send(
              JSON.stringify({
                event: "messages_read_ack",
                data: { message_ids, status: "READ" },
              })
            );
          }
        }
      }

      // =========================================================
      // EVENT 3: TYPING STATUS (✍️ User Typing...)
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
    // 🔴 PRESENCE OFFLINE BROADCAST
    broadcastPresence(ws.companyId, ws.userId, ws.role, "OFFLINE");
    logger.info(`Chat Socket Disconnected: ${clientKey}`);
  });
}

// Helper: Target Controllers, Admins ya Driver ko Typing notify karne ke liye
function broadcastToTarget(companyId, targetRole, targetId, eventName, payload) {
  if (targetRole === "CONTROLLER" || targetRole === "ADMIN") {
    for (let [key, clientWs] of connectedClients.entries()) {
      if (
        key.startsWith(`${companyId}_${targetRole}_`) &&
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

// Helper: Online / Offline Status Broadcast
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