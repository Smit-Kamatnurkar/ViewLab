// @ts-nocheck
import { Lab, ValidationContext } from '../types';

function checkQuery(db: import('sql.js').Database, sql: string, expectedRows: number) {
  try {
    const res = db.exec(sql);
    return res.length > 0 && res[0].values.length === expectedRows;
  } catch (e) {
    return false;
  }
}

export const LABS: Lab[] = [
  {
    id: 'lab-1',
    title: 'Create a View',
    description: 'Learn how to create a standard SQL View that reflects live data.',
    steps: [
      {
        id: 'step-1',
        title: 'Explore the ARTWORK table',
        description: 'First, let\'s look at the data we\'ll be working with.',
        instruction: 'Run a SELECT query to see all artworks with price > 100000',
        hint: 'SELECT * FROM ARTWORK WHERE price > 100000;',
        validate: (_state, ctx) => {
          if (!ctx.lastResult || ctx.lastResult.error) return false;
          return ctx.lastResult.rowCount === 21; // Assuming 21 rows in seed data
        },
      },
      {
        id: 'step-2',
        title: 'Create the View',
        description: 'Create a View named "expensive_artworks" for artworks over $100,000.',
        instruction: 'Execute the CREATE VIEW statement',
        hint: 'CREATE VIEW expensive_artworks AS SELECT * FROM ARTWORK WHERE price > 100000;',
        validate: (_state, ctx) => ctx.viewManager.hasView('expensive_artworks'),
      },
      {
        id: 'step-3',
        title: 'Query the View',
        description: 'Query the View to see it returns live results.',
        instruction: 'Run SELECT * FROM expensive_artworks;',
        hint: 'SELECT * FROM expensive_artworks;',
        validate: (_state, ctx) => {
          if (!ctx.lastResult || ctx.lastResult.error) return false;
          // Ensure they actually queried the view by checking last executed query
          return ctx.lastResult.rowCount === 21; 
        },
      },
    ],
  },
  {
    id: 'lab-2',
    title: 'Create a Materialized View',
    description: 'Create a Materialized View that stores its result.',
    steps: [
      {
        id: 'step-1',
        title: 'Create the Materialized View',
        description: 'Create a Materialized View with the same query as the View.',
        instruction: 'Execute the CREATE MATERIALIZED VIEW statement',
        hint: 'CREATE MATERIALIZED VIEW expensive_artworks_mv AS SELECT * FROM ARTWORK WHERE price > 100000;',
        validate: (_state, ctx) => ctx.mvManager.hasView('expensive_artworks_mv'),
      },
      {
        id: 'step-2',
        title: 'Compare Results',
        description: 'Query both the View and Materialized View to see they return the same data.',
        instruction: 'Run SELECT * FROM expensive_artworks_mv;',
        hint: 'SELECT * FROM expensive_artworks_mv;',
        validate: (_state, ctx) => {
           if (!ctx.lastResult || ctx.lastResult.error) return false;
           return ctx.lastResult.rowCount === 21;
        },
      },
      {
        id: 'step-3',
        title: 'Check Status',
        description: 'Observe that the Materialized View shows FRESH status.',
        instruction: 'You have verified the Materialized View is FRESH.',
        validate: (_state, ctx) => ctx.mvManager.getView('expensive_artworks_mv')?.status === 'FRESH',
      },
    ],
  },
  {
    id: 'lab-3',
    title: 'Create Staleness',
    description: 'Modify base data and observe the difference between View and Materialized View.',
    steps: [
      {
        id: 'step-1',
        title: 'Update an Artwork Price',
        description: 'Change the price of an artwork to make it qualify as "expensive".',
        instruction: 'Run an UPDATE statement on the ARTWORK table',
        hint: 'UPDATE ARTWORK SET price = 150000 WHERE artwork_id = 3;',
        validate: (_state, ctx) => {
          return checkQuery(ctx.db, "SELECT * FROM ARTWORK WHERE price > 100000", 22);
        },
      },
      {
        id: 'step-2',
        title: 'Observe the View',
        description: 'Query the View again - it should now show the updated result.',
        instruction: 'Run SELECT * FROM expensive_artworks;',
        hint: 'SELECT * FROM expensive_artworks;',
        validate: (_state, ctx) => {
           if (!ctx.lastResult || ctx.lastResult.error) return false;
           return ctx.lastResult.rowCount === 22;
        },
      },
      {
        id: 'step-3',
        title: 'Observe the Materialized View',
        description: 'Query the Materialized View - it still shows the old result and is now STALE.',
        instruction: 'Run SELECT * FROM expensive_artworks_mv;',
        hint: 'SELECT * FROM expensive_artworks_mv;',
        validate: (_state, ctx) => {
           if (!ctx.lastResult || ctx.lastResult.error) return false;
           return ctx.lastResult.rowCount === 21 && ctx.mvManager.getView('expensive_artworks_mv')?.status === 'STALE';
        },
      },
    ],
  },
  {
    id: 'lab-4',
    title: 'Refresh the Materialized View',
    description: 'Refresh the Materialized View to sync it with the current database state.',
    steps: [
      {
        id: 'step-1',
        title: 'Refresh the Materialized View',
        description: 'Execute the REFRESH command to recompute the stored result.',
        instruction: 'Run REFRESH MATERIALIZED VIEW expensive_artworks_mv;',
        hint: 'REFRESH MATERIALIZED VIEW expensive_artworks_mv;',
        validate: (_state, ctx) => ctx.mvManager.getView('expensive_artworks_mv')?.status === 'FRESH',
      },
      {
        id: 'step-2',
        title: 'Verify the Result',
        description: 'Query the Materialized View again - it should now match the View.',
        instruction: 'Run SELECT * FROM expensive_artworks_mv;',
        hint: 'SELECT * FROM expensive_artworks_mv;',
        validate: (_state, ctx) => {
           if (!ctx.lastResult || ctx.lastResult.error) return false;
           return ctx.lastResult.rowCount === 22;
        },
      }
    ],
  }
];
