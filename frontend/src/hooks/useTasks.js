import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

/**
 * Owns the socket.io connection and the task list it syncs. Kept separate
 * from KanbanBoard so the component itself stays focused on rendering, and
 * so this hook can be unit/integration tested by injecting a fake socket
 * factory without needing a real network connection.
 *
 * @param {() => import('socket.io-client').Socket} [socketFactory] - optional
 *   override used by tests to inject a mock socket instead of connecting
 *   for real.
 */
export function useTasks(socketFactory = () => io(SOCKET_URL)) {
  const [tasks, setTasks] = useState([]);
  const [connected, setConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = socketFactory();
    socketRef.current = socket;

    function handleConnect() {
      setConnected(true);
    }
    function handleDisconnect() {
      setConnected(false);
    }
    function handleSync(nextTasks) {
      setTasks(nextTasks);
      setIsSyncing(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("sync:tasks", handleSync);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("sync:tasks", handleSync);
      socket.close();
    };
    // socketFactory is intentionally treated as stable; passing a new
    // function identity on every render would reconnect needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("task:create", payload, (ack) => {
        if (ack?.ok) resolve(ack.task);
        else reject(new Error(ack?.error || "Failed to create task"));
      });
    });
  }, []);

  const updateTask = useCallback((id, updates) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("task:update", { id, ...updates }, (ack) => {
        if (ack?.ok) resolve(ack.task);
        else reject(new Error(ack?.error || "Failed to update task"));
      });
    });
  }, []);

  const moveTask = useCallback((id, column, order) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("task:move", { id, column, order }, (ack) => {
        if (ack?.ok) resolve(ack.task);
        else reject(new Error(ack?.error || "Failed to move task"));
      });
    });
  }, []);

  const deleteTask = useCallback((id) => {
    return new Promise((resolve, reject) => {
      socketRef.current?.emit("task:delete", { id }, (ack) => {
        if (ack?.ok) resolve();
        else reject(new Error(ack?.error || "Failed to delete task"));
      });
    });
  }, []);

  return { tasks, connected, isSyncing, createTask, updateTask, moveTask, deleteTask };
}
