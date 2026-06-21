import { vi } from "vitest";
import { act } from "@testing-library/react";

/**
 * A minimal fake of a socket.io-client socket, good enough to drive
 * KanbanBoard/useTasks in tests without opening a real network connection.
 *
 * Usage:
 *   const socket = createMockSocket();
 *   render(<KanbanBoard socketFactory={() => socket} />);
 *   socket.__trigger('sync:tasks', [...]);
 */
export function createMockSocket() {
  const listeners = new Map();

  const socket = {
    on: vi.fn((event, handler) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
    }),
    off: vi.fn((event, handler) => {
      listeners.get(event)?.delete(handler);
    }),
    emit: vi.fn((event, payload, ack) => {
      // Default no-op emit; individual tests override this via
      // socket.emit.mockImplementation(...) when they need to assert on
      // outgoing events or simulate a server acknowledgement.
      if (typeof ack === "function") ack({ ok: true });
    }),
    close: vi.fn(),
    connected: true,

    // Test helper: simulate the server pushing an event to this client.
    // Wrapped in act() because this fires outside of React's normal event
    // handling, so without it state updates wouldn't be flushed before the
    // test's next assertion runs.
    __trigger(event, payload) {
      act(() => {
        listeners.get(event)?.forEach((handler) => handler(payload));
      });
    },
  };

  return socket;
}
