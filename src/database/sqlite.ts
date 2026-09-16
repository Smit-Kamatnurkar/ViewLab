import initSqlJs, { Database } from 'sql.js';
// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

const SCHEMA_SQL = `
-- Artists table
CREATE TABLE IF NOT EXISTS ARTIST (
  artist_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  birth_year INTEGER
);

-- Artworks table
CREATE TABLE IF NOT EXISTS ARTWORK (
  artwork_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY (artist_id) REFERENCES ARTIST(artist_id)
);

-- Sales table
CREATE TABLE IF NOT EXISTS SALE (
  sale_id INTEGER PRIMARY KEY,
  artwork_id INTEGER NOT NULL,
  buyer TEXT NOT NULL,
  sale_date TEXT NOT NULL,
  sale_price INTEGER NOT NULL,
  FOREIGN KEY (artwork_id) REFERENCES ARTWORK(artwork_id)
);
`;

const SEED_SQL = `
-- Artists
INSERT INTO ARTIST (artist_id, name, country, birth_year) VALUES
(1, 'Leonardo da Vinci', 'Italy', 1452),
(2, 'Vincent van Gogh', 'Netherlands', 1853),
(3, 'Pablo Picasso', 'Spain', 1881),
(4, 'Claude Monet', 'France', 1840),
(5, 'Frida Kahlo', 'Mexico', 1907),
(6, 'Salvador Dalí', 'Spain', 1904),
(7, 'Georgia O''Keeffe', 'USA', 1887),
(8, 'Jackson Pollock', 'USA', 1912),
(9, 'Andy Warhol', 'USA', 1928),
(10, 'Yayoi Kusama', 'Japan', 1929),
(11, 'Banksy', 'UK', 1974),
(12, 'Ai Weiwei', 'China', 1957),
(13, 'Kehinde Wiley', 'USA', 1977),
(14, 'Cindy Sherman', 'USA', 1954),
(15, 'Takashi Murakami', 'Japan', 1962);

-- Artworks
INSERT INTO ARTWORK (artwork_id, title, artist_id, category, price) VALUES
(1, 'Mona Lisa', 1, 'Portrait', 850000000),
(2, 'The Last Supper', 1, 'Religious', 450000000),
(3, 'Starry Night', 2, 'Landscape', 100000000),
(4, 'Sunflowers', 2, 'Still Life', 85000000),
(5, 'The Starry Night Over the Rhône', 2, 'Landscape', 75000000),
(6, 'Guernica', 3, 'Political', 200000000),
(7, 'Les Demoiselles d''Avignon', 3, 'Cubist', 180000000),
(8, 'The Weeping Woman', 3, 'Portrait', 95000000),
(9, 'Water Lilies', 4, 'Landscape', 80000000),
(10, 'Impression, Sunrise', 4, 'Landscape', 70000000),
(11, 'Haystacks', 4, 'Landscape', 65000000),
(12, 'The Two Fridas', 5, 'Self-Portrait', 55000000),
(13, 'Self-Portrait with Thorn Necklace', 5, 'Self-Portrait', 45000000),
(14, 'The Persistence of Memory', 6, 'Surrealist', 150000000),
(15, 'The Elephants', 6, 'Surrealist', 120000000),
(16, 'Black Iris III', 7, 'Floral', 40000000),
(17, 'Red Canna', 7, 'Floral', 35000000),
(18, 'Number 1A', 8, 'Abstract', 140000000),
(19, 'Convergence', 8, 'Abstract', 90000000),
(20, 'Campbell''s Soup Cans', 9, 'Pop Art', 100000000),
(21, 'Marilyn Diptych', 9, 'Pop Art', 120000000),
(22, 'Infinity Mirror Room', 10, 'Installation', 80000000),
(23, 'Pumpkin', 10, 'Sculpture', 60000000),
(24, 'Girl with Balloon', 11, 'Street Art', 25000000),
(25, 'Love is in the Bin', 11, 'Street Art', 18000000),
(26, 'Sunflower Seeds', 12, 'Installation', 70000000),
(27, 'Dropping a Han Dynasty Urn', 12, 'Conceptual', 45000000),
(28, 'Portrait of Barack Obama', 13, 'Portrait', 50000000),
(29, 'Untitled Film Still #21', 14, 'Photography', 30000000),
(30, 'Flower Ball', 15, 'Contemporary', 40000000);

-- Sales
INSERT INTO SALE (sale_id, artwork_id, buyer, sale_date, sale_price) VALUES
(1, 3, 'Museum of Modern Art', '2023-01-15', 100000000),
(2, 4, 'National Gallery London', '2023-02-20', 85000000),
(3, 9, 'Musée d''Orsay', '2023-03-10', 80000000),
(4, 10, 'Private Collector', '2023-04-05', 70000000),
(5, 12, 'Private Collector', '2023-05-12', 55000000),
(6, 14, 'Museum of Modern Art', '2023-06-18', 150000000),
(7, 16, 'Private Collector', '2023-07-22', 40000000),
(8, 18, 'Private Collector', '2023-08-30', 140000000),
(9, 20, 'Whitney Museum', '2023-09-14', 100000000),
(10, 22, 'Tate Modern', '2023-10-01', 80000000),
(11, 24, 'Sotheby''s Auction', '2023-11-08', 25000000),
(12, 26, 'Private Collector', '2023-12-03', 70000000),
(13, 28, 'National Portrait Gallery', '2024-01-10', 50000000),
(14, 29, 'Private Collector', '2024-02-14', 30000000),
(15, 30, 'Gagosian Gallery', '2024-03-20', 40000000);
`;

export async function initializeDatabase(): Promise<Database> {
  console.log('[ViewLab] Loading sql.js');
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });

  console.log('[ViewLab] sql.js loaded successfully. Creating database');
  const db = new SQL.Database();

  console.log('[ViewLab] Seeding database schema');
  db.run(SCHEMA_SQL);
  db.run(SEED_SQL);

  console.log('[ViewLab] Database seeded successfully');
  return db;
}

export function exportDatabase(db: Database): Uint8Array {
  return db.export();
}

export async function importDatabase(data: Uint8Array): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  return new SQL.Database(data);
}

export type { Database };