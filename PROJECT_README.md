# Real-time Kanban Board

A WebSocket-powered Kanban board built with React + Socket.IO, with drag-and-drop, file attachments, priority/category tagging, a live progress chart, and a three-layer test suite (Vitest unit, Vitest integration, Playwright E2E).

## Stack

- **Frontend:** React 19, Vite, [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) (drag-and-drop), Recharts (progress chart), socket.io-client
- **Backend:** Node.js, Express, Socket.IO, in-memory task store
- **Testing:** Vitest + React Testing Library (unit/integration, both frontend and backend), Playwright (E2E)

## Running locally

You need two terminals — the backend and frontend are separate processes.

```bash
# Terminal 1 - backend
cd backend
npm install
npm run dev          # nodemon, runs on http://localhost:5000

# Terminal 2 - frontend
cd frontend
npm install
npm run dev           # Vite dev server, runs on http://localhost:3000
```

Open `http://localhost:3000`. Open a second tab to see real-time sync between two clients.

### Running the tests

```bash
# Backend tests (task store logic + real Socket.IO connections)
cd backend && npm test

# Frontend unit + integration tests
cd frontend && npm test

# Frontend E2E tests (requires the backend running on :5000 separately,
# Playwright will start the frontend dev server itself)
cd frontend && npx playwright install chromium   # first time only
cd frontend && npm run test:e2e
```

## Architecture notes

**Task store is in-memory** (`backend/taskStore.js`), resetting on server restart. The store is written as a small class with a clean `create/update/move/remove/getAll` API specifically so swapping it for a MongoDB-backed implementation later is a contained change — nothing in `server.js` or the frontend would need to change, since they only talk to that interface.

**Socket events use acknowledgement callbacks.** Every `task:*` emit from the client takes an `ack` callback, so the UI knows definitively whether a create/move/delete succeeded rather than assuming success. On failure (e.g. an empty title), the form surfaces the server's error message directly.

**State sync is full-list, not diffed.** `sync:tasks` broadcasts the entire task array on every mutation. That's the right tradeoff at this scale (a handful of users, a few dozen tasks) — it keeps the client logic trivial and avoids merge-conflict edge cases. At real production scale with hundreds of concurrent users you'd want to send deltas (`task:created`, `task:moved`, etc.) instead of a full broadcast each time.

**Drag-and-drop:** went with `@hello-pangea/dnd` (the actively maintained fork of `react-beautiful-dnd`) over `@dnd-kit` — it's a smaller API surface for a straightforward multi-column board like this, and its accessibility behavior (keyboard dragging, screen reader announcements) comes for free.

**Dropdowns are native `<select>` elements,** not `react-select`. For two fixed, short option lists (priority, category) a native select is simpler, fully accessible out of the box, and zero extra dependency weight — `react-select` earns its cost when you need async option loading, multi-select, or large searchable lists, none of which apply here.

**File attachments use `URL.createObjectURL`** to generate a local preview URL, per the assignment brief's "simulated backend storage" note. In a real product this would upload to S3/Cloudinary/etc. and the server would store the resulting URL on the task.

## Test strategy across the three layers

- **Unit (Vitest):** pure functions in `utils/taskHelpers.js` (grouping, progress stats, file validation) tested in total isolation — no rendering, no sockets. Cheapest tests to write and the first line of defense.
- **Integration (Vitest + RTL):** `KanbanBoard` rendered with a mock socket (`src/tests/mockSocket.js`) that lets tests simulate server broadcasts and assert on outgoing `socket.emit` calls — covers form submission, deletion, multi-client convergence (two independently rendered clients receiving the same broadcast), and error-path handling, without needing a real network connection.
- **E2E (Playwright):** runs against the real app, real backend, real WebSocket connection, real browser. Covers task creation, drag-and-drop (driven via manual `page.mouse` sequences rather than `dragTo()`, since `@hello-pangea/dnd` listens for real pointer events rather than native HTML5 drag events), cross-client real-time sync using two independent browser contexts, deletion, priority/category selection, file-type validation, and the progress chart.

Drag-and-drop interaction is deliberately **not** exercised in the Vitest integration layer — jsdom has no real layout or pointer engine, so simulating a drag library's pointer sequence there produces a test that's either flaky or fake. That coverage lives entirely in Playwright, where it's real.

## Known issues found in the starter pack (and how they were handled)

While going through the provided scaffold before writing any code, a few things didn't line up and are worth being upfront about:

1. **`playwright.config.js` had `testDir: "./tests/e2e"`,** but the actual test file lives at `src/tests/e2e/`. Playwright would have silently found zero tests. Fixed the path.
2. **`headless: false` in the same config, directly under a comment saying "Run tests in headless mode."** Set to `true` to match the comment's intent and to work in CI/sandboxed environments without a display.
3. **`src/tests/unit/KanbanBoard.test.jsx` imported from `../../src/components/KanbanBoard.jsx`,** which resolves to a nonexistent `src/src/...` path from that file's location. Fixed to `../../components/KanbanBoard.jsx`, matching the pattern already used correctly in the integration test.
4. **No `.gitignore` was included,** which would have meant committing `node_modules` for both packages. Added one.

## Things worth knowing before you read the code

- `npm audit` reports a number of vulnerabilities in both packages. Nearly all trace back to transitive dependencies of the starter's pinned dev tooling (`vite`, `vitest`, `eslint`, `playwright` itself) rather than anything added for this assignment — `npm audit fix` was deliberately **not** run blind, since force-bumping pinned versions in someone else's starter risks breaking the toolchain in ways that are hard to diagnose under a deadline. Worth a follow-up pass outside the time box of this assignment.
- The production build (`npm run build`) compiles cleanly but emits a chunk-size warning (~680KB main bundle, mostly from Recharts). Worth code-splitting in a real product via `React.lazy()` for the chart, not done here to keep scope contained for a 2-month internship assignment.
- The chart (Recharts bar chart of column counts + completion %) is included, but was treated as the first thing to cut if time ran short, per the README's own weighting (Testing is 50% of the grade; the chart's UI/UX bucket is 10%).
- I was not able to execute the Playwright E2E suite myself in the environment I built this in (no internet access to download browser binaries), only verify it compiles and that the app boots cleanly end-to-end. Please run `npm run test:e2e` yourself before considering it confirmed — everything else (37 Vitest tests across both packages) was run and is passing.
