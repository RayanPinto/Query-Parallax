# Database Schema Documentation

## Overview
The database contains a **realistic e-commerce analytics dataset** designed to demonstrate parallel query processing across multiple workers.

## Database Statistics
- **Total Tables**: 5
- **Total Rows**: 21,505
- **Database Size**: ~15 MB
- **DBMS**: PostgreSQL 15

---

## Schema Diagram

```
┌─────────────────┐
│  DEPARTMENTS    │
├─────────────────┤
│ dept_id (PK)    │
│ dept_name       │
│ budget          │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────────┐
│    EMPLOYEES        │
├─────────────────────┤
│ emp_id (PK)         │
│ name                │
│ dept_id (FK)        │
│ salary              │
│ hire_date           │
└────────┬────────────┘
         │
         │ 1:N
         │
┌────────▼────────────┐       ┌─────────────────┐
│      ORDERS         │       │    PRODUCTS     │
├─────────────────────┤       ├─────────────────┤
│ order_id (PK)       │       │ product_id (PK) │
│ emp_id (FK)         │       │ product_name    │
│ customer_name       │       │ category        │
│ order_date          │       │ price           │
│ total_amount        │       └────────┬────────┘
└────────┬────────────┘                │
         │                             │
         │ 1:N                    N:1   │
         │                             │
         └────────┬────────────────────┘
                  │
         ┌────────▼────────────┐
         │   ORDER_ITEMS       │
         ├─────────────────────┤
         │ order_item_id (PK)  │
         │ order_id (FK)       │
         │ product_id (FK)     │
         │ quantity            │
         │ unit_price          │
         └─────────────────────┘
```

---

## Table Details

### 1. DEPARTMENTS
**Purpose**: Store organizational departments

| Column | Type | Description |
|--------|------|-------------|
| dept_id | SERIAL PRIMARY KEY | Unique department identifier |
| dept_name | VARCHAR(100) | Department name (Sales, Engineering, etc.) |
| budget | DECIMAL(15,2) | Annual budget in USD |

**Row Count**: 5 departments

---

### 2. EMPLOYEES
**Purpose**: Employee master data

| Column | Type | Description |
|--------|------|-------------|
| emp_id | SERIAL PRIMARY KEY | Unique employee ID |
| name | VARCHAR(100) | Employee full name |
| dept_id | INTEGER FK | References departments.dept_id |
| salary | DECIMAL(10,2) | Annual salary in USD |
| hire_date | DATE | Date of joining |

**Row Count**: 1,000 employees

---

### 3. PRODUCTS
**Purpose**: Product catalog

| Column | Type | Description |
|--------|------|-------------|
| product_id | SERIAL PRIMARY KEY | Unique product identifier |
| product_name | VARCHAR(200) | Product name |
| category | VARCHAR(50) | Product category (Electronics, Books, etc.) |
| price | DECIMAL(10,2) | Unit price in USD |

**Row Count**: 500 products

---

### 4. ORDERS
**Purpose**: Customer order headers

| Column | Type | Description |
|--------|------|-------------|
| order_id | SERIAL PRIMARY KEY | Unique order number |
| emp_id | INTEGER FK | Sales representative (references employees) |
| customer_name | VARCHAR(100) | Customer name |
| order_date | DATE | Order placement date |
| total_amount | DECIMAL(15,2) | Total order value in USD |

**Row Count**: 5,000 orders

---

### 5. ORDER_ITEMS
**Purpose**: Order line items (order details)

| Column | Type | Description |
|--------|------|-------------|
| order_item_id | SERIAL PRIMARY KEY | Unique line item ID |
| order_id | INTEGER FK | References orders.order_id |
| product_id | INTEGER FK | References products.product_id |
| quantity | INTEGER | Number of units ordered |
| unit_price | DECIMAL(10,2) | Price per unit at time of order |

**Row Count**: 15,000 line items

---

## Queries to Show Schema (Run During Presentation)

### 1. Show All Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Show Table Row Counts
```sql
SELECT 
  'Departments' as table_name, COUNT(*) as row_count FROM departments
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items;
```

### 3. Describe a Table (e.g., employees)
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;
```

### 4. Show Sample Data
```sql
-- Show first 5 employees
SELECT * FROM employees LIMIT 5;

-- Show department summary
SELECT 
  d.dept_name, 
  COUNT(e.emp_id) as employee_count,
  AVG(e.salary)::DECIMAL(10,2) as avg_salary
FROM departments d
LEFT JOIN employees e ON d.dept_id = e.dept_id
GROUP BY d.dept_name;
```

---

## Presentation Talking Points

### If Asked: "Can you show me the database?"

**What to Say:**
> "Absolutely! Let me show you the schema. We have a realistic e-commerce dataset with 5 interconnected tables representing a typical business scenario."

**Then Run:**
1. Navigate to "Query Execution" page
2. Run the "Show Table Row Counts" query
3. Explain: "This shows we have over 21,000 rows across departments, employees, products, orders, and order items."

### If Asked: "What kind of relationships exist?"

**What to Say:**
> "We have classic relational constraints:
> - Departments have multiple Employees (1:N)
> - Employees process multiple Orders (1:N)
> - Orders contain multiple Items (1:N)
> - Each Order Item references a Product (N:1)
>
> This allows us to demonstrate complex JOINs and aggregations across tables—exactly the type of queries that benefit most from parallelization."

### If Asked: "How much data?"

**What to Say:**
> "We're working with ~21,000 rows across 5 tables. While this might seem small, it's perfect for demonstrating our system's capabilities in a local environment. In production, this same architecture scales to millions of rows across distributed nodes."

---

## Visual Demo Commands

### Connect to Database (If Needed)
```bash
# From inside the postgres pod
kubectl exec -it <postgres-pod-name> -- psql -U postgres -d taskdb
```

### Quick Stats Query
```sql
-- Show data distribution
SELECT 
  (SELECT COUNT(*) FROM departments) as departments,
  (SELECT COUNT(*) FROM employees) as employees,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM order_items) as order_items;
```

---

## Why This Schema is Perfect for Your Demo

1. **Realistic**: Mirrors real-world e-commerce analytics
2. **Join-Heavy**: Multiple foreign keys = complex queries = parallelization benefits
3. **Scalable**: Structure supports adding millions more rows
4. **Range-Partitionable**: ID columns allow easy splitting across workers
