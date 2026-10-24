import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

type Request = { id: number; query: string; dataset: 'Employees' | 'Orders' | 'Library'; expectedQuery?: string };
let database: Database | undefined;
async function openDatabase(dataset: Request['dataset']): Promise<Database> {
  if (database) return database;
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  database = new SQL.Database();
  database.run(`
    CREATE TABLE departments(id INTEGER PRIMARY KEY, name TEXT, location TEXT);
    CREATE TABLE employees(id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER, salary INTEGER, hired_at TEXT);
    CREATE TABLE orders(id INTEGER PRIMARY KEY, employee_id INTEGER, total REAL, status TEXT, created_at TEXT);
    INSERT INTO departments VALUES (1,'Engineering','Bengaluru'),(2,'Product','Mumbai'),(3,'Design','Pune'),(4,'Operations','Delhi');
    INSERT INTO employees VALUES
      (1,'Alex Morgan',1,128000,'2021-03-12'),(2,'Sam Rivera',3,112000,'2022-07-18'),(3,'Jordan Lee',2,121000,'2020-11-03'),
      (4,'Taylor Chen',1,135000,'2019-01-24'),(5,'Morgan Patel',4,93000,'2023-02-10'),(6,'Casey Kim',2,116000,'2022-09-05'),
      (7,'Riley Shah',3,107000,'2021-06-20'),(8,'Jamie Singh',1,119000,'2024-01-08'),(9,'Avery Diaz',4,98500,'2020-05-14'),
      (10,'Quinn Park',1,141000,'2018-08-30'),(11,'Reese Ali',2,122000,'2023-04-02'),(12,'Drew Bell',3,110000,'2022-12-17');
    INSERT INTO orders VALUES (1,1,245.50,'shipped','2025-02-01'),(2,2,89.00,'pending','2025-02-03'),(3,1,410.25,'shipped','2025-02-05'),(4,4,72.00,'cancelled','2025-02-06');
  `);
  if (dataset === 'Orders') database.run('CREATE VIEW IF NOT EXISTS order_summary AS SELECT * FROM orders');
  if (dataset === 'Library') database.run(`CREATE TABLE IF NOT EXISTS books(id INTEGER PRIMARY KEY,title TEXT,author TEXT,genre TEXT,available INTEGER); INSERT OR IGNORE INTO books VALUES (1,'The Quiet Algorithm','N. Rao','Technology',1),(2,'River of Stars','M. Sen','Fiction',0),(3,'Small Worlds','A. Iyer','Science',1);`);
  return database;
}
self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, query, dataset } = event.data;
  const started = performance.now();
  try {
    if (!query.trim()) throw new Error('Enter a SQL query first.');
    if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA)\b/i.test(query)) throw new Error('The workbench is read-only. Only SELECT and WITH queries are allowed.');
if (!/^\s*(SELECT|WITH)\b/i.test(query)) throw new Error('Only SELECT and WITH queries are allowed.');
    const allowed = dataset === 'Employees' ? new Set(['employees','departments']) : dataset === 'Orders' ? new Set(['orders','employees','departments']) : new Set(['books']);
    const tables = [...query.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)/gi)].map(match => match[1].toLowerCase());
    if (tables.some(table => !allowed.has(table))) throw new Error(`The ${dataset} dataset does not expose one of those tables.`);
    const db = await openDatabase(dataset);
    const results = db.exec(query);
    const columns = results[0]?.columns ?? [];
    const rows = results[0]?.values ?? [];
    const expected = event.data.expectedQuery ? db.exec(event.data.expectedQuery)[0]?.values ?? [] : undefined;
    const accepted = expected === undefined ? undefined : JSON.stringify(rows) === JSON.stringify(expected);
    self.postMessage({ id, ok: true, columns, rows, elapsed: Math.round(performance.now() - started), count: rows.length, accepted });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'SQL query failed.' });
  }
};


