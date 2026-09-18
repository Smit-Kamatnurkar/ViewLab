export const SHOP_SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  city TEXT,
  email TEXT,
  signup_year INTEGER
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT,
  category TEXT,
  price REAL,
  stock INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date TEXT,
  status TEXT,
  total_amount REAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`;

export const SHOP_SEED = `
INSERT INTO customers (id, name, city, email, signup_year) VALUES
(1, 'Aarav Mehta', 'Mumbai', 'aarav@example.com', 2024),
(2, 'Diya Shah', 'Pune', 'diya@example.com', 2023),
(3, 'Kabir Rao', 'Bengaluru', 'kabir@example.com', 2025),
(4, 'Anaya Iyer', 'Chennai', 'anaya@example.com', 2024),
(5, 'Rohan Gupta', 'Delhi', 'rohan@example.com', 2022),
(6, 'Meera Nair', 'Kochi', 'meera@example.com', 2025),
(7, 'Vivaan Joshi', 'Jaipur', 'vivaan@example.com', 2023),
(8, 'Sara Khan', 'Hyderabad', 'sara@example.com', 2024);

INSERT INTO products (id, name, category, price, stock) VALUES
(1, 'Mechanical Keyboard', 'Electronics', 3499, 42),
(2, 'Wireless Mouse', 'Electronics', 1299, 85),
(3, 'USB-C Hub', 'Electronics', 2199, 31),
(4, 'Notebook', 'Stationery', 299, 120),
(5, 'Desk Lamp', 'Home', 1599, 26),
(6, 'Water Bottle', 'Lifestyle', 899, 64),
(7, 'Backpack', 'Lifestyle', 2499, 37),
(8, 'Monitor Stand', 'Home', 1899, 18);

INSERT INTO orders (id, customer_id, order_date, status, total_amount) VALUES
(1, 1, '2026-01-12', 'Delivered', 4798),
(2, 2, '2026-01-18', 'Delivered', 2499),
(3, 3, '2026-02-02', 'Shipped', 3499),
(4, 4, '2026-02-09', 'Delivered', 1599),
(5, 5, '2026-02-15', 'Cancelled', 1299),
(6, 6, '2026-02-21', 'Delivered', 3098),
(7, 7, '2026-03-01', 'Shipped', 2199),
(8, 8, '2026-03-05', 'Processing', 3798),
(9, 1, '2026-03-09', 'Delivered', 899),
(10, 3, '2026-03-14', 'Processing', 2499);

INSERT INTO order_items (id, order_id, product_id, quantity) VALUES
(1, 1, 1, 1),
(2, 1, 2, 1),
(3, 2, 7, 1),
(4, 3, 1, 1),
(5, 4, 5, 1),
(6, 5, 2, 1),
(7, 6, 7, 1),
(8, 6, 6, 1),
(9, 7, 3, 1),
(10, 8, 1, 1),
(11, 8, 6, 1),
(12, 9, 6, 1),
(13, 10, 7, 1);
`;

export const HOSPITAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY,
  name TEXT,
  age INTEGER,
  city TEXT,
  gender TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id INTEGER PRIMARY KEY,
  name TEXT,
  specialization TEXT,
  department TEXT,
  experience_years INTEGER
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER,
  doctor_id INTEGER,
  appointment_date TEXT,
  status TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id INTEGER PRIMARY KEY,
  appointment_id INTEGER,
  diagnosis TEXT,
  severity TEXT,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);
`;

export const HOSPITAL_SEED = `
INSERT INTO patients (id, name, age, city, gender) VALUES
(1, 'Ishaan Verma', 34, 'Delhi', 'Male'),
(2, 'Anvi Patel', 27, 'Ahmedabad', 'Female'),
(3, 'Reyansh Singh', 51, 'Lucknow', 'Male'),
(4, 'Myra Thomas', 42, 'Chennai', 'Female'),
(5, 'Arjun Menon', 63, 'Kochi', 'Male'),
(6, 'Kiara Das', 36, 'Kolkata', 'Female'),
(7, 'Aditya Rao', 48, 'Hyderabad', 'Male'),
(8, 'Tara Kapoor', 29, 'Mumbai', 'Female'),
(9, 'Neil Joseph', 57, 'Bengaluru', 'Male'),
(10, 'Riya Sharma', 45, 'Pune', 'Female');

INSERT INTO doctors (id, name, specialization, department, experience_years) VALUES
(1, 'Dr. Kavya Nair', 'Cardiology', 'Cardiology', 12),
(2, 'Dr. Rahul Mehta', 'Neurology', 'Neurology', 15),
(3, 'Dr. Sneha Iyer', 'Pediatrics', 'Pediatrics', 8),
(4, 'Dr. Vikram Shah', 'Orthopedics', 'Orthopedics', 18),
(5, 'Dr. Neha Rao', 'Dermatology', 'Dermatology', 10),
(6, 'Dr. Arjun Kapoor', 'General Medicine', 'General Medicine', 14);

INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, status) VALUES
(1, 1, 1, '2026-02-03', 'Completed'),
(2, 2, 5, '2026-02-05', 'Completed'),
(3, 3, 2, '2026-02-08', 'Completed'),
(4, 4, 6, '2026-02-10', 'Completed'),
(5, 5, 4, '2026-02-12', 'Cancelled'),
(6, 6, 3, '2026-02-15', 'Completed'),
(7, 7, 1, '2026-02-18', 'Scheduled'),
(8, 8, 5, '2026-02-20', 'Completed'),
(9, 9, 2, '2026-02-22', 'Scheduled'),
(10, 10, 6, '2026-02-25', 'Completed'),
(11, 1, 6, '2026-03-02', 'Scheduled'),
(12, 4, 1, '2026-03-04', 'Completed');

INSERT INTO diagnoses (id, appointment_id, diagnosis, severity) VALUES
(1, 1, 'Hypertension', 'Moderate'),
(2, 2, 'Acne', 'Mild'),
(3, 3, 'Migraine', 'Moderate'),
(4, 4, 'Diabetes', 'Moderate'),
(5, 6, 'Asthma', 'Mild'),
(6, 8, 'Dermatitis', 'Mild'),
(7, 10, 'Diabetes', 'Moderate'),
(8, 12, 'Arrhythmia', 'Severe');
`;
