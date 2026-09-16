# ViewLab — Core Algorithms & System Architecture

This document provides a comprehensive technical breakdown of the core algorithms, data structures, and state propagation mechanisms powering ViewLab.

---

## 1. SQL Parser & Statement Classification

### Overview
ViewLab utilizes a custom regex-based lexer/parser tailored for single and multi-statement DDL, DML, and DBMS control commands.

```
                  ┌────────────────────────┐
                  │   Raw SQL Statement    │
                  └───────────┬────────────┘
                              │
                      [ Regex Lexer ]
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
  [ DDL Operator ]                         [ DML Operator ]
 ── CREATE VIEW                           ── INSERT INTO <table>
 ── CREATE MATERIALIZED VIEW              ── UPDATE <table>
 ── DROP VIEW                             ── DELETE FROM <table>
 ── REFRESH MATERIALIZED VIEW
```

### Statement Classification Pipeline
1. **Normalization**: SQL strings are stripped of leading/trailing whitespace and comments (`--` and `/* ... */`).
2. **Keyword Extraction**: The leading tokens are matched against standard SQL clauses (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE VIEW`, `CREATE MATERIALIZED VIEW`, `DROP VIEW`, `REFRESH MATERIALIZED VIEW`).
3. **Table & View Extraction**:
   - For `CREATE VIEW <name> AS <query>`: Extracts `<name>` and `<query>`.
   - For `CREATE MATERIALIZED VIEW <name> AS <query>`: Extracts `<name>` and `<query>`.
   - For `REFRESH MATERIALIZED VIEW <name>`: Extracts `<name>`.
   - For `INSERT/UPDATE/DELETE`: Identifies the target table being modified.

### Time & Space Complexity
- **Time Complexity**: $\mathcal{O}(N)$ where $N$ is the character length of the SQL statement.
- **Space Complexity**: $\mathcal{O}(N)$ for tokenized strings and AST representation.

---

## 2. Dependency Tracking & Directed Acyclic Graph (DAG)

### Data Structure
ViewLab maintains a directed graph $G = (V, E)$ in `DependencyTracker`:
- **Nodes ($V$)**: Represent Database Objects (Base Tables, Views, Materialized Views).
- **Edges ($E$)**: Represent direct dependency relations $(u, v)$ where object $v$ depends directly on object $u$ ($u \to v$).

```
        ┌────────────────┐
        │   ARTWORK      │ (Base Table)
        └───────┬────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
 ┌───────────────┐ ┌────────────────────────┐
 │expensive_art  │ │expensive_artworks_mv   │
 │ (Virtual View)│ │ (Materialized View)    │
 └───────────────┘ └────────────────────────┘
```

### Dependency Resolution Algorithm
When a View or Materialized View definition $Q$ is created:
1. Scan $Q$ for table references matching known base tables and existing views in the schema.
2. For each identified source $S$:
   - Add a directed edge $S \to V_{new}$ to $E$.
3. Check for circular dependencies using Breadth-First Search (BFS) or Depth-First Search (DFS). If a path $V_{new} \rightsquigarrow S$ exists, reject the view creation as invalid.

---

## 3. Stale State Propagation Algorithm

### Overview
When a DML operation (`INSERT`, `UPDATE`, `DELETE`) modifies a base table $T$:
1. $T$'s data changes immediately in SQLite.
2. Virtual Views require no invalidation because their queries execute dynamically upon access.
3. Materialized Views dependent on $T$ (directly or transitively) transition to `STALE`.

### Transitive Stale Invalidation (BFS / DFS Traversal)
```typescript
function invalidateDependents(sourceTable: string) {
  const queue = [sourceTable];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const directDependents = graph.getOutEdges(current);
    for (const dep of directDependents) {
      if (mvManager.hasView(dep)) {
        mvManager.setStatus(dep, 'STALE');
      }
      queue.push(dep);
    }
  }
}
```

### Time & Space Complexity
- **Time Complexity**: $\mathcal{O}(|V| + |E|)$ where $|V|$ is the number of nodes and $|E|$ is the number of dependency edges in the database graph.
- **Space Complexity**: $\mathcal{O}(|V|)$ for the queue and visited set.

---

## 4. Materialized View Refresh Logic

### Execution Flow
When `REFRESH MATERIALIZED VIEW <name>` is invoked:
1. Retrieve the original defining query $Q$ stored during `CREATE MATERIALIZED VIEW`.
2. Re-execute $Q$ against the current live database state in SQLite.
3. Drop the old physical table representing the materialized view.
4. Re-create and populate the physical table with the fresh query result.
5. Update the status of `<name>` from `STALE` $\to$ `FRESH` and record `lastRefreshedAt = Date.now()`.

---

## 5. Summary Matrix of Operations

| Operation | Base Table Data | Virtual View | Materialized View | Graph Propagation |
|:---|:---|:---|:---|:---|
| **CREATE VIEW** | Unchanged | Defined (No data stored) | N/A | Node + Edge Added |
| **CREATE MV** | Unchanged | N/A | Query executed, Table stored | Node + Edge Added (`FRESH`) |
| **DML (INSERT/UPDATE/DELETE)** | Rows modified | Dynamic read reflects new data | Status becomes `STALE` | BFS propagates `STALE` |
| **REFRESH MV** | Unchanged | N/A | Query re-executed, Table updated | Status becomes `FRESH` |
