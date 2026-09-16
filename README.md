# ViewLab — View & Materialized View Simulator

**DBMS Module 2 Project: Interactive Simulator for Virtual Views, Materialized Views, and Dependency Invalidation**

ViewLab is a visually impressive, educational, interactive DBMS simulator built to demonstrate exactly how standard **Views** (virtual, computed dynamically) and **Materialized Views** (physical, snapshot storage) operate under the hood, how base table DML operations propagate dependency changes, and when materialized views become `STALE`.

---

## 📚 DBMS Syllabus Mapping

- **Module**: DBMS Module 2 (Relational Model, Schema Definition, Views, Materialized Views, Invalidation Policies)
- **Target Learning Objectives**:
  - Understand the difference between Virtual Views vs. Materialized Views.
  - Visualize execution cost: query re-computation vs. physical storage access.
  - Trace state propagation: DML updates (`INSERT`/`UPDATE`/`DELETE`) $\to$ DAG edge traversal $\to$ `STALE` flagging.
  - Perform manual snapshot synchronization via `REFRESH MATERIALIZED VIEW`.

---

## ✨ Features

- **⚡ In-Memory SQLite Engine**: Client-side execution powered by `sql.js` (SQLite compiled to WebAssembly).
- **👁️ Virtual View Manager**: Create dynamic views with zero storage overhead; always returns current base table data.
- **💾 Materialized View Manager**: Materialize query results as physical SQLite tables; tracks freshness and staleness.
- **🕸️ Dependency Tracker DAG**: Interactive graph powered by ReactFlow showing real-time node statuses (`LIVE`, `FRESH`, `STALE`).
- **🧪 Execution Simulator**: Animated step-by-step pipeline visualizing parsing, dependency extraction, query execution, and storage materialization.
- **⚔️ View vs. MV Comparison View**: Side-by-side comparison of live virtual queries vs stored physical snapshots.
- **🔬 4 Interactive Guided Labs**: Step-by-step challenges with auto-validation to master DDL, DML, and view refresh cycles.
- **📚 12-Section Comprehensive Tutorial**: In-depth theoretical explanations, SVG diagrams, and interactive SQL triggers.
- **📊 Export & Reports**: Download query results in CSV format, export execution logs, or generate markdown reports.
- **🤖 Context-Aware AI Assistant**: Interactive database tutor with zero-config Mock mode or BYOK (OpenAI/Anthropic).

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla Tailwind CSS with custom CSS variable design system (Full Dark & Light mode support)
- **Database Engine**: `sql.js` (WASM SQLite)
- **State Management**: Zustand with `localStorage` persistence
- **Graph Visualization**: ReactFlow
- **Code Editor**: CodeMirror 6 with SQL syntax highlighting

---

## 🚀 Quick Start

```bash
# Clone the project repository
cd ViewLab

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📖 Key Workflows to Try

1. **Create a View**:
   ```sql
   CREATE VIEW expensive_artworks AS 
   SELECT * FROM ARTWORK WHERE price > 100000;
   ```
2. **Create a Materialized View**:
   ```sql
   CREATE MATERIALIZED VIEW expensive_artworks_mv AS 
   SELECT * FROM ARTWORK WHERE price > 100000;
   ```
3. **Trigger Base Table DML**:
   ```sql
   UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;
   ```
4. **Compare Query Results**:
   - `SELECT * FROM expensive_artworks;` $\to$ Returns updated price ($150,000$).
   - `SELECT * FROM expensive_artworks_mv;` $\to$ Returns old snapshot data (`STALE` state).
5. **Refresh Materialized View**:
   ```sql
   REFRESH MATERIALIZED VIEW expensive_artworks_mv;
   ```
   - MV state updates back to `FRESH` and data reflects current base table rows.

---

## 📄 Documentation & Algorithm Details

See [`ALGORITHMS.md`](file:///home/aadi/Projects/ViewLab/ALGORITHMS.md) for complete technical breakdowns of SQL parsing, DAG invalidation algorithms, and time/space complexity analysis.

---

## 📜 License

MIT License
