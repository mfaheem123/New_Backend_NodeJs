let io;

function initIO(serverIO) {
  io = serverIO;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

module.exports = {
  initIO,
  getIO,
};
