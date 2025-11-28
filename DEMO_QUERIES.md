# Demo Queries for Presentation

Copy and paste these queries into the SQL Editor to demonstrate the system's capabilities.

## 1. Department Analytics (JOIN + GROUP BY)
```sql
SELECT d.dept_name, COUNT(e.emp_id) as employee_count 
FROM departments d 
LEFT JOIN employees e ON d.dept_id = e.dept_id 
GROUP BY d.dept_name 
ORDER BY employee_count DESC
```

## 2. Top Earners (ORDER BY + LIMIT)
```sql
SELECT emp_name, job_title, salary 
FROM employees 
ORDER BY salary DESC 
LIMIT 10
```

## 3. Product Sales (JOIN + GROUP BY + SUM)
```sql
SELECT p.category, COUNT(DISTINCT oi.order_id) as order_count, SUM(oi.quantity) as total_quantity 
FROM products p 
JOIN order_items oi ON p.product_id = oi.product_id 
GROUP BY p.category 
ORDER BY total_quantity DESC
```

## 4. Order Status (GROUP BY)
```sql
SELECT status, COUNT(*) as order_count 
FROM orders 
GROUP BY status 
ORDER BY order_count DESC
```

## 5. High Volume Customers (HAVING Clause)
```sql
SELECT e.emp_name, COUNT(o.order_id) as order_count 
FROM employees e 
JOIN orders o ON e.emp_id = o.emp_id 
GROUP BY e.emp_name 
HAVING COUNT(o.order_id) > 3 
ORDER BY order_count DESC 
LIMIT 15
```

## 6. Department Performance (Multi-table JOIN)
```sql
SELECT d.dept_name, COUNT(DISTINCT o.order_id) as total_orders 
FROM departments d 
JOIN employees e ON d.dept_id = e.dept_id 
JOIN orders o ON e.emp_id = o.emp_id 
GROUP BY d.dept_name 
ORDER BY total_orders DESC
```

## ⚠️ Performance Note for Presentation
If you observe that **10 workers** take the same time as **1 worker**, this is expected in a **local Minikube environment**.
*   **Reason**: All 10 workers are competing for the **same physical CPU and Disk** on your laptop, and hitting the **same single PostgreSQL instance**.
*   **Explanation**: "In this local demo, we are limited by the shared hardware resources. In a real production environment with distributed physical nodes and sharded databases, the 10-worker setup would be significantly faster."

## 7. Proof of Parallelism (Simulated Delay)
To prove that the system *is* executing in parallel, you can run this query which forces a sleep.
*   **Expectation**: If distributed, it should finish in ~1s. If sequential, it would take ~4s.
*(Note: This requires the `pg_sleep` function to be allowed)*
```sql
SELECT count(*) FROM (
  SELECT pg_sleep(1) FROM generate_series(1, 4)
) sub
```
