# Kanban Project

## Business Requirements
- User can sign in
- When signed in, user sees a Kanban board for a single project
- An MVP of a Kanban style Project Management application as a web app  
- The web app should only have 1 board
- The board has fixed 5 columns that can be renamed  
- Each card has a title and details only
- Drag and drop interface to move cards between columns
- Add a new card to a column; delete an existing card
- No more functionality: no archive, no search/filter. Keep it simple.
- The priority is a slick, professional, gorgeous UI/UX with very simple features
- The app should open with dummy data populated for the single board
- The sidebar has an AI chat feature on the right hand side. The AI should be able to answer questions about the board and the cards. It should use the same color scheme and styling as the rest of the app. 
- The AI can create, update, move, or delete the cards and columns

## Limitations
- The user sign in is hardcoded as 'admin' with PASSWORD in .env being the password
- The AI is hardcoded to use the OpenAI API with the key from .env 'OPENROUTER_API_KEY'
- Only one kanban board per user
- Run locally in a docker container

## Technical Details

- Implemented as a modern NextJS app, client rendered
- The NextJS app should be created in a subdirectory `frontend`
- Python FastAPI backend, includng serving the static NextJS app and the AI chat API
- Everything packaged into a docker container with docker-compose
- Use pdm as the package manager for python in the docker container
- Use OpenRouter for API calls. OPENROUTER_API_KEY from .env is the api key.
- Use openai/gpt-oss:20b for the AI or comparable
- No user management for the MVP
- Use SQLlite for the local database, creating a new table if it doesn't exist 
- Database is always in the docker container with the rest of the application
- As simple as possible but with an elegant UI
- Make file updated to run the application on docker
- Make lint, test, e2e tests, and security tests
- Use latest version of libraries and idiomatic approaches as of today
- Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
- Keep README minimal. IMPORTANT: no emojis ever    
- Provide a login page, but only the hardcoded user admin with password in .env PASSWORD can login
- Provide a logout button
- provide .env.example to show how to configure local variables

## Starting Point
- The application is currently a front-end only demo MVP with dummy data.
- No docker setup
- No backend or API or AI chat
- Make does not support backend or full deployment with docker locally
- Docs are end-user docs for current front end functionality

### Avoiding hydration errors with drag-and-drop (Next.js App Router)

Libraries such as `@dnd-kit` attach accessibility attributes (for example `aria-describedby` with generated ids) that can differ between server-rendered HTML and the first client render. That produces React hydration warnings (“server rendered HTML didn’t match the client”).

To avoid this:

1. **Do not server-render the board subtree** that wraps `DndContext` / sortable items. Load it only in the browser (for example with `next/dynamic` and `{ ssr: false }`).
2. **Never put `{ ssr: false }` on `next/dynamic` inside a Server Component** (including the default export in `app/page.tsx`). Next.js disallows it there. Use a small wrapper file with `"use client"` that calls `dynamic(..., { ssr: false })` and import that wrapper from the page.

Optional: add a Playwright check that fails if hydration-mismatch messages appear in the console after the board loads.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Strategy

1. Write plan with success criteria for each phase to be checked off. Include project scaffolding, including .gitignore, and rigorous unit testing.
2. Execute the plan ensuring all critiera are met
3. Carry out extensive integration testing with Playwright or similar, fixing defects
4. Only complete when the MVP is finished and tested, with the server running and ready for the user

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever

## Working Documentation

All documents for planning and execution for this project will be in the docs/ directory. Please review the docs/plan.md file for the high level plan before proceeding.