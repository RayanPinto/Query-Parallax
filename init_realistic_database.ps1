# Initialize Realistic Database Schema for Presentation
# This creates tables with meaningful business data

Write-Host "=== Initializing Realistic Database Schema ===" -ForegroundColor Cyan

$bin = "$PSScriptRoot\bin"
$kubectl = "$bin\kubectl.exe"

# Get postgres pod
$postgresPod = & $kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}'
Write-Host "Postgres pod: $postgresPod" -ForegroundColor Yellow

# Create comprehensive database schema
$schema = @"
-- Drop existing tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Create Departments table
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    budget DECIMAL(12,2)
);

-- Create Employees table
CREATE TABLE employees (
    emp_id SERIAL PRIMARY KEY,
    emp_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    dept_id INTEGER REFERENCES departments(dept_id),
    salary DECIMAL(10,2),
    hire_date DATE,
    job_title VARCHAR(100)
);

-- Create Products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INTEGER
);

-- Create Orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    emp_id INTEGER REFERENCES employees(emp_id),
    order_date DATE,
    total_amount DECIMAL(12,2),
    status VARCHAR(20)
);

-- Create Order Items table
CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER,
    unit_price DECIMAL(10,2)
);

-- Insert Departments (5 departments)
INSERT INTO departments (dept_name, location, budget) VALUES
('Sales', 'New York', 500000.00),
('Engineering', 'San Francisco', 1200000.00),
('Marketing', 'Los Angeles', 350000.00),
('HR', 'Chicago', 200000.00),
('Finance', 'Boston', 400000.00);

-- Insert Employees (1000 employees)
INSERT INTO employees (emp_name, email, dept_id, salary, hire_date, job_title)
SELECT 
    'Employee_' || i,
    'emp' || i || '@company.com',
    (i % 5) + 1,  -- Distribute across 5 departments
    30000 + (RANDOM() * 120000)::INTEGER,
    DATE '2015-01-01' + (RANDOM() * 3000)::INTEGER,
    CASE (i % 10)
        WHEN 0 THEN 'Manager'
        WHEN 1 THEN 'Senior Engineer'
        WHEN 2 THEN 'Engineer'
        WHEN 3 THEN 'Sales Representative'
        WHEN 4 THEN 'Marketing Specialist'
        WHEN 5 THEN 'Analyst'
        WHEN 6 THEN 'Coordinator'
        WHEN 7 THEN 'Consultant'
        WHEN 8 THEN 'Associate'
        ELSE 'Specialist'
    END
FROM generate_series(1, 1000) AS i;

-- Insert Products (500 products)
INSERT INTO products (product_name, category, price, stock_quantity)
SELECT 
    'Product_' || i,
    CASE (i % 5)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Clothing'
        WHEN 2 THEN 'Food'
        WHEN 3 THEN 'Books'
        ELSE 'Home & Garden'
    END,
    10 + (RANDOM() * 990)::DECIMAL(10,2),
    (RANDOM() * 1000)::INTEGER
FROM generate_series(1, 500) AS i;

-- Insert Orders (5000 orders)
INSERT INTO orders (emp_id, order_date, total_amount, status)
SELECT 
    (RANDOM() * 999 + 1)::INTEGER,
    DATE '2023-01-01' + (RANDOM() * 700)::INTEGER,
    100 + (RANDOM() * 9900)::DECIMAL(12,2),
    CASE (RANDOM() * 3)::INTEGER
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Completed'
        ELSE 'Shipped'
    END
FROM generate_series(1, 5000) AS i;

-- Insert Order Items (15000 items - avg 3 items per order)
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT 
    (RANDOM() * 4999 + 1)::INTEGER,
    (RANDOM() * 499 + 1)::INTEGER,
    (RANDOM() * 10 + 1)::INTEGER,
    10 + (RANDOM() * 990)::DECIMAL(10,2)
FROM generate_series(1, 15000) AS i;

-- Verify data
SELECT 'Departments' as table_name, COUNT(*) as row_count FROM departments
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items;
"@

Write-Host "`nCreating realistic database schema..." -ForegroundColor Yellow
$schema | & $kubectl exec -i $postgresPod -- psql -U user -d demo

Write-Host "`n=== Database Schema Created Successfully! ===" -ForegroundColor Green
Write-Host "`nTables created:" -ForegroundColor Cyan
Write-Host "  - departments (5 rows)" -ForegroundColor White
Write-Host "  - employees (1000 rows)" -ForegroundColor White
Write-Host "  - products (500 rows)" -ForegroundColor White
Write-Host "  - orders (5000 rows)" -ForegroundColor White
Write-Host "  - order_items (15000 rows)" -ForegroundColor White
Write-Host "`nTotal: 21,505 rows across 5 tables" -ForegroundColor Yellow
