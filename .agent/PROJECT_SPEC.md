Architectural Rules for AI Agent

    1 Data Flow: All writes must go through src/db/index.ts (RxDB). All reads must come from src/stores/lifeStore.ts (Nano Stores).

    2 Styling: Use Tailwind CSS with the established Obsidian/Platinum/Gold palette.

    3 Interactivity: Every interactive component must be a React Island.tsx (.tsx) and use the client:load directive in Astro pages.

    4 Types: Never use any. Reference src/types/models.ts for all data structures.

    5 Animations: Use Framer Motion for entry/exit transitions. Transitions should be subtle (200-400ms).