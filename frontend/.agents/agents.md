# Frontend Documentation

## Architecture & Conventions
- **Next.js**: Using App Router (Next.js 16.2.4).
- **Styling**: Tailwind CSS configured via PostCSS. The `globals.css` defines base CSS variables for the color scheme (Accent Yellow, Blue Primary, Purple Secondary, Dark Navy, Gray Text).

## Main Components
- **`KanbanBoardLoader.tsx`**: Dynamically imports the `KanbanBoard` component with `{ ssr: false }` to avoid SSR hydration mismatches with `@dnd-kit`.
- **`KanbanBoard.tsx`**: The main Kanban state container. Currently relies on hardcoded dummy data. Manages the `@dnd-kit/core` logic (Sensors, `DndContext`, `DragOverlay`).
- **`KanbanColumn.tsx`**: Renders a single column in the Kanban board.
- **`KanbanCard.tsx`**: Renders an individual card, allowing it to be draggable.
- **`EditableProjectTitle.tsx`**: Handles inline edits for text like Column names.

## State Management
- Currently relying on React `useState` at the `KanbanBoard` level.
- When connected to the backend, state should be initialized from a `fetch` and any actions (drag, add, delete) should optimistically update the UI and send a POST/PUT/DELETE request to the backend.

## AI Chat Interface
- A future `SidebarChat.tsx` will be integrated into the `KanbanBoard` view or its parent layout.
