import { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'employee-dept',
    title: 'Employee Department Summary',
    description: 'Track employee counts by department. See how Views and Materialized Views behave when new employees are added.',
    icon: '👥',
    schemaSQL: `CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary INTEGER NOT NULL
);`,
    seedSQL: `INSERT INTO employees (id, name, department, salary) VALUES
(1, 'Alice', 'CSE', 75000),
(2, 'Bob', 'CSE', 80000),
(3, 'Carol', 'ECE', 70000),
(4, 'Dave', 'ECE', 72000),
(5, 'Eve', 'MECH', 68000);`,
    createViewSQL: `CREATE VIEW dept_summary AS
SELECT department, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;`,
    createMVSQL: `CREATE MATERIALIZED VIEW dept_summary_mv AS
SELECT department, COUNT(*) AS employee_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;`,
    dmlSQL: `INSERT INTO employees (id, name, department, salary)
VALUES (6, 'Frank', 'CSE', 85000);`,
    refreshSQL: `REFRESH MATERIALIZED VIEW dept_summary_mv;`,
    expectedStale: 'After inserting Frank into CSE, the View will show CSE with 3 employees, but the Materialized View will still show 2 until refreshed.',
  },
  {
    id: 'sales-monthly',
    title: 'Sales Monthly Summary',
    description: 'Aggregate monthly sales data. Demonstrates how precomputed aggregations in MVs become stale with new transactions.',
    icon: '💰',
    schemaSQL: `CREATE TABLE IF NOT EXISTS sales (
  sale_id INTEGER PRIMARY KEY,
  product TEXT NOT NULL,
  amount INTEGER NOT NULL,
  sale_month TEXT NOT NULL
);`,
    seedSQL: `INSERT INTO sales (sale_id, product, amount, sale_month) VALUES
(1, 'Laptop', 1200, '2024-01'),
(2, 'Phone', 800, '2024-01'),
(3, 'Tablet', 500, '2024-02'),
(4, 'Laptop', 1300, '2024-02'),
(5, 'Phone', 750, '2024-03');`,
    createViewSQL: `CREATE VIEW monthly_revenue AS
SELECT sale_month, SUM(amount) AS total_revenue, COUNT(*) AS num_sales
FROM sales
GROUP BY sale_month;`,
    createMVSQL: `CREATE MATERIALIZED VIEW monthly_revenue_mv AS
SELECT sale_month, SUM(amount) AS total_revenue, COUNT(*) AS num_sales
FROM sales
GROUP BY sale_month;`,
    dmlSQL: `INSERT INTO sales (sale_id, product, amount, sale_month)
VALUES (6, 'Monitor', 450, '2024-01');`,
    refreshSQL: `REFRESH MATERIALIZED VIEW monthly_revenue_mv;`,
    expectedStale: 'Adding a January sale changes the View total for 2024-01 to $2450, but the MV still shows $2000.',
  },
  {
    id: 'student-cgpa',
    title: 'Student CGPA Report',
    description: 'Calculate department-wise CGPA statistics. Shows how grade changes affect Views instantly but not Materialized Views.',
    icon: '🎓',
    schemaSQL: `CREATE TABLE IF NOT EXISTS students (
  roll_no INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  cgpa REAL NOT NULL
);`,
    seedSQL: `INSERT INTO students (roll_no, name, department, cgpa) VALUES
(1, 'Arjun', 'CSE', 8.5),
(2, 'Priya', 'CSE', 9.2),
(3, 'Rahul', 'ECE', 7.8),
(4, 'Sneha', 'ECE', 8.1),
(5, 'Kiran', 'MECH', 7.5),
(6, 'Meera', 'MECH', 8.9);`,
    createViewSQL: `CREATE VIEW dept_cgpa_report AS
SELECT department, COUNT(*) AS student_count,
  ROUND(AVG(cgpa), 2) AS avg_cgpa,
  MAX(cgpa) AS highest_cgpa
FROM students
GROUP BY department;`,
    createMVSQL: `CREATE MATERIALIZED VIEW dept_cgpa_report_mv AS
SELECT department, COUNT(*) AS student_count,
  ROUND(AVG(cgpa), 2) AS avg_cgpa,
  MAX(cgpa) AS highest_cgpa
FROM students
GROUP BY department;`,
    dmlSQL: `UPDATE students SET cgpa = 9.8 WHERE roll_no = 1;`,
    refreshSQL: `REFRESH MATERIALIZED VIEW dept_cgpa_report_mv;`,
    expectedStale: 'After updating Arjun\'s CGPA to 9.8, the View shows the updated CSE average, but the MV retains the old value.',
  },
  {
    id: 'product-category',
    title: 'Product Category Statistics',
    description: 'Analyze product inventory by category. Observe how adding new products affects aggregated category stats.',
    icon: '📦',
    schemaSQL: `CREATE TABLE IF NOT EXISTS products (
  product_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL
);`,
    seedSQL: `INSERT INTO products (product_id, name, category, price, stock) VALUES
(1, 'iPhone 15', 'Electronics', 999.99, 50),
(2, 'MacBook Pro', 'Electronics', 2499.99, 30),
(3, 'Running Shoes', 'Sports', 129.99, 100),
(4, 'Yoga Mat', 'Sports', 39.99, 200),
(5, 'Novel: Dune', 'Books', 14.99, 500),
(6, 'Cookbook', 'Books', 24.99, 150);`,
    createViewSQL: `CREATE VIEW category_stats AS
SELECT category, COUNT(*) AS product_count,
  ROUND(AVG(price), 2) AS avg_price,
  SUM(stock) AS total_stock
FROM products
GROUP BY category;`,
    createMVSQL: `CREATE MATERIALIZED VIEW category_stats_mv AS
SELECT category, COUNT(*) AS product_count,
  ROUND(AVG(price), 2) AS avg_price,
  SUM(stock) AS total_stock
FROM products
GROUP BY category;`,
    dmlSQL: `INSERT INTO products (product_id, name, category, price, stock)
VALUES (7, 'AirPods', 'Electronics', 249.99, 75);`,
    refreshSQL: `REFRESH MATERIALIZED VIEW category_stats_mv;`,
    expectedStale: 'Adding AirPods increases Electronics count to 3 in the View, but the MV still shows 2 products.',
  },
  {
    id: 'order-revenue',
    title: 'Order Revenue Dashboard',
    description: 'Track order revenue by customer. Demonstrates real-world dashboard scenarios where MVs power fast reads.',
    icon: '📊',
    schemaSQL: `CREATE TABLE IF NOT EXISTS orders (
  order_id INTEGER PRIMARY KEY,
  customer TEXT NOT NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  order_date TEXT NOT NULL
);`,
    seedSQL: `INSERT INTO orders (order_id, customer, product, quantity, unit_price, order_date) VALUES
(1, 'Acme Corp', 'Widget A', 100, 10.00, '2024-01-15'),
(2, 'Acme Corp', 'Widget B', 50, 25.00, '2024-01-20'),
(3, 'Beta Inc', 'Widget A', 200, 10.00, '2024-02-01'),
(4, 'Beta Inc', 'Gadget X', 30, 50.00, '2024-02-15'),
(5, 'Gamma LLC', 'Widget B', 75, 25.00, '2024-03-01');`,
    createViewSQL: `CREATE VIEW customer_revenue AS
SELECT customer,
  COUNT(*) AS total_orders,
  SUM(quantity * unit_price) AS total_revenue
FROM orders
GROUP BY customer;`,
    createMVSQL: `CREATE MATERIALIZED VIEW customer_revenue_mv AS
SELECT customer,
  COUNT(*) AS total_orders,
  SUM(quantity * unit_price) AS total_revenue
FROM orders
GROUP BY customer;`,
    dmlSQL: `INSERT INTO orders (order_id, customer, product, quantity, unit_price, order_date)
VALUES (6, 'Acme Corp', 'Gadget X', 40, 50.00, '2024-03-10');`,
    refreshSQL: `REFRESH MATERIALIZED VIEW customer_revenue_mv;`,
    expectedStale: 'Acme Corp\'s revenue increases by $2000 in the View, but the MV still shows the old total until refreshed.',
  },
];
