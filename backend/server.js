const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { TaskStore } = require("./taskStore");

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const store = new TaskStore();

// Simple health check, useful once this is deployed (Render/Railway free
// tiers spin down on inactivity and ping this to wake the service back up).
app.get("/health", (_req, res) => res.json({ status: "ok" }));

function broadcastTasks() {
  io.emit("sync:tasks", store.getAll());
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send the current board state to whoever just connected so they don't
  // see an empty board while everyone else already has tasks.
  socket.emit("sync:tasks", store.getAll());

  socket.on("task:create", (payload, ack) => {
    try {
      const task = store.create(payload);
      broadcastTasks();
      if (typeof ack === "function") ack({ ok: true, task });
    } catch (err) {
      console.error("task:create failed:", err.message);
      if (typeof ack === "function") ack({ ok: false, error: err.message });
    }
  });

  socket.on("task:update", ({ id, ...updates } = {}, ack) => {
    try {
      const task = store.update(id, updates);
      broadcastTasks();
      if (typeof ack === "function") ack({ ok: true, task });
    } catch (err) {
      console.error("task:update failed:", err.message);
      if (typeof ack === "function") ack({ ok: false, error: err.message });
    }
  });

  socket.on("task:move", ({ id, column, order } = {}, ack) => {
    try {
      const task = store.move(id, { column, order });
      broadcastTasks();
      if (typeof ack === "function") ack({ ok: true, task });
    } catch (err) {
      console.error("task:move failed:", err.message);
      if (typeof ack === "function") ack({ ok: false, error: err.message });
    }
  });

  socket.on("task:delete", ({ id } = {}, ack) => {
    try {
      const existed = store.remove(id);
      broadcastTasks();
      if (typeof ack === "function") ack({ ok: existed });
    } catch (err) {
      console.error("task:delete failed:", err.message);
      if (typeof ack === "function") ack({ ok: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io, store };
