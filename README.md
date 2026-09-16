# ViewLab

ViewLab is an interactive SQL laboratory designed for understanding the differences between SQL Views and Materialized Views. 

It provides an educational sandbox for experimenting with database dependencies, query execution plans, and performance characteristics between always-current virtual tables and persisted materialized datasets.

## Features

- **SQL Lab:** A full-featured interactive SQL editor based on CodeMirror.
- **Views:** Define standard virtual tables and trace their execution.
- **Materialized Views:** Create persisted views and observe staleness when base tables update.
- **Dependency Graph:** A live, interactive DAG (Directed Acyclic Graph) visualization of table and view relationships.
- **Query X-Ray:** Step-by-step query execution planner to understand performance implications.
- **Comparison Engine:** Side-by-side comparison of View vs Materialized View query results and states.
- **Interactive Labs:** Step-by-step gamified tutorials to teach you SQL concepts.
- **AI Assistant:** Context-aware, BYOK (Bring-Your-Own-Key) AI integration that understands your current database state and graph.
- **BYOK AI Providers:** Configure OpenAI, Anthropic, or OpenAI-compatible endpoints directly in your browser.
- **Theme Switching:** Dynamic Neumorphic UI with intelligent Light/Dark mode toggles.

## Tech Stack

ViewLab is built strictly as a client-side application running completely in the browser for maximum performance and portability:

- **Framework:** React 18
- **Build Tool:** Vite
- **Database:** `sql.js` (SQLite compiled to WebAssembly)
- **State Management:** Zustand (with local storage persistence)
- **Editor:** CodeMirror 6 (with SQL language support)
- **Graph Visualization:** ReactFlow
- **Styling:** Tailwind CSS (Custom Neumorphic design system)
- **Language:** TypeScript

## Getting Started

Because ViewLab is fully client-side and relies on an in-memory WebAssembly SQLite database, no complex server setup is required. 

```bash
# 1. Clone the repository
git clone <repository-url>
cd viewlab

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser. 

### AI Configuration (Optional)
To use the built-in AI Assistant:
1. Navigate to **System > Settings** in the application sidebar.
2. Select your provider (OpenAI, Anthropic, or Custom).
3. Input your API key. Keys are securely stored in your browser's local storage and are never sent to our servers (because there is no server!).

## License

MIT
