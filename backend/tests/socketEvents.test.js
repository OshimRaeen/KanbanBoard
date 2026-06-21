import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer } from "http";
import { Server } from "socket.io";
import Client from "socket.io-client";
import { TaskStore } from "../taskStore.js";

/**
 * These tests spin up a real Socket.IO server (on an ephemeral port) and
 * connect real client sockets to it, rather than mocking the transport.
 * This exercises the actual event contract between client and server,
 * which is what the README's "WebSocket Implementation" criteria is
 * really asking us to prove out.
 */
/**
 * Waits for a sync:tasks broadcast whose task list satisfies `predicate`,
 * rather than blindly awaiting the "next" event. Because sync:tasks fires
 * on every connection AND every mutation, naively awaiting "the next one"
 * is racy - this waits for the specific state we actually care about.
 */
function waitForSyncContaining(socket, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("sync:tasks", handler);
      reject(new Error("Timed out waiting for matching sync:tasks broadcast"));
    }, timeoutMs);

    function handler(tasks) {
      if (tasks.some(predicate)) {
        clearTimeout(timer);
        socket.off("sync:tasks", handler);
        resolve(tasks);
      }
    }

    socket.on("sync:tasks", handler);
  });
}

function startTestServer() {
  const store = new TaskStore();
  const httpServer = createServer();
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    socket.emit("sync:tasks", store.getAll());

    socket.on("task:create", (payload, ack) => {
      try {
        const task = store.create(payload);
        io.emit("sync:tasks", store.getAll());
        ack?.({ ok: true, task });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on("task:move", ({ id, column, order } = {}, ack) => {
      try {
        const task = store.move(id, { column, order });
        io.emit("sync:tasks", store.getAll());
        ack?.({ ok: true, task });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on("task:delete", ({ id } = {}, ack) => {
      const existed = store.remove(id);
      io.emit("sync:tasks", store.getAll());
      ack?.({ ok: existed });
    });
  });

  return new Promise((resolve) => {
    httpServer.listen(() => {
      const port = httpServer.address().port;
      resolve({ httpServer, io, store, port });
    });
  });
}
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${port}`;

describe("WebSocket task events", () => {
  let httpServer;
  let io;
  let port;
  let clientA;
  let clientB;

  beforeAll(async () => {
    ({ httpServer, io, port } = await startTestServer());
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  beforeEach(async () => {
    clientA?.close();
    clientB?.close();

    clientA = Client(SERVER_URL);
    clientB = Client(SERVER_URL);

    await Promise.all([
      new Promise((resolve) => clientA.on("connect", resolve)),
      new Promise((resolve) => clientB.on("connect", resolve)),
    ]);
  });

  test("a newly connected client receives the current task list via sync:tasks", async () => {
    const freshClient = Client(SERVER_URL);
    const tasks = await new Promise((resolve) => {
      freshClient.once("sync:tasks", resolve);
    });

    expect(Array.isArray(tasks)).toBe(true);
    freshClient.close();
  });

  test("creating a task on one client broadcasts sync:tasks to all clients", async () => {
    const bUpdate = waitForSyncContaining(clientB, (t) => t.title === "Shared task");

    clientA.emit("task:create", { title: "Shared task" });

    const tasks = await bUpdate;
    expect(tasks.some((t) => t.title === "Shared task")).toBe(true);
  });

  test("task:create acknowledgement reports success and returns the created task", async () => {
    const ack = await new Promise((resolve) => {
      clientA.emit("task:create", { title: "Ack me" }, resolve);
    });

    expect(ack.ok).toBe(true);
    expect(ack.task.title).toBe("Ack me");
  });

  test("task:create acknowledgement reports failure for an invalid payload", async () => {
    const ack = await new Promise((resolve) => {
      clientA.emit("task:create", { title: "" }, resolve);
    });

    expect(ack.ok).toBe(false);
    expect(ack.error).toMatch(/required/i);
  });

  test("moving a task updates its column for every connected client", async () => {
    const createAck = await new Promise((resolve) => {
      clientA.emit("task:create", { title: "To be moved" }, resolve);
    });
    const taskId = createAck.task.id;

    const bUpdate = waitForSyncContaining(clientB, (t) => t.id === taskId && t.column === "done");
    clientA.emit("task:move", { id: taskId, column: "done" });

    const tasks = await bUpdate;
    const moved = tasks.find((t) => t.id === taskId);
    expect(moved.column).toBe("done");
  });

  test("deleting a task removes it for every connected client", async () => {
    const createAck = await new Promise((resolve) => {
      clientA.emit("task:create", { title: "To be deleted" }, resolve);
    });
    const taskId = createAck.task.id;

    const bUpdate = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        clientB.off("sync:tasks", handler);
        reject(new Error("Timed out waiting for task removal to broadcast"));
      }, 4000);

      function handler(tasks) {
        if (!tasks.some((t) => t.id === taskId)) {
          clearTimeout(timer);
          clientB.off("sync:tasks", handler);
          resolve(tasks);
        }
      }
      clientB.on("sync:tasks", handler);
    });

    clientA.emit("task:delete", { id: taskId });

    const tasks = await bUpdate;
    expect(tasks.find((t) => t.id === taskId)).toBeUndefined();
  });
});
