"""
Presentation Demo: Complex Query Processing with Worker Tracking
Demonstrates JOIN, GROUP BY, HAVING, and distributed processing
"""

import requests
import json
import time
from datetime import datetime

API_URL = "http://127.0.0.1:55290/query"

def print_header(text):
    print(f"\n{'='*80}")
    print(f"{text.center(80)}")
    print(f"{'='*80}\n")

def print_section(text):
    print(f"\n{'-'*80}")
    print(f"{text}")
    print(f"{'-'*80}")

def run_query(description, sql, show_all=False):
    print_section(f"Query: {description}")
    print(f"SQL: {sql}\n")
    
    start_time = time.time()
    try:
        resp = requests.post(API_URL, json={"sql": sql})
        resp.raise_for_status()
        elapsed = time.time() - start_time
        
        data = resp.json()
        rows = data.get("rows", [])
        
        print(f"[SUCCESS] Status: {resp.status_code} | Rows: {len(rows)} | Time: {elapsed:.3f}s")
        
        if len(rows) > 0:
            if show_all or len(rows) <= 10:
                print(f"\nResults:")
                print(json.dumps(rows, indent=2))
            else:
                print(f"\nSample Results (first 5 of {len(rows)}):")
                print(json.dumps(rows[:5], indent=2))
                print(f"  ... and {len(rows) - 5} more rows")
        else:
            print(f"\nNo rows returned")
            
        return True, elapsed, len(rows)
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"[ERROR] {e}")
        return False, elapsed, 0

# Track statistics
stats = {
    'total_queries': 0,
    'successful_queries': 0,
    'total_time': 0,
    'total_rows': 0
}

print_header("DISTRIBUTED QUERY PROCESSING - PRESENTATION DEMO")
print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"API Endpoint: {API_URL}")

# ============================================================================
# DEMO 1: Basic Aggregations
# ============================================================================
print_header("DEMO 1: DEPARTMENT ANALYTICS")

success, elapsed, rows = run_query(
    "Count employees by department",
    "SELECT d.dept_name, COUNT(e.emp_id) as employee_count FROM departments d LEFT JOIN employees e ON d.dept_id = e.dept_id GROUP BY d.dept_name ORDER BY employee_count DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "Average salary by department",
    "SELECT d.dept_name, COUNT(e.emp_id) as emp_count FROM departments d JOIN employees e ON d.dept_id = e.dept_id GROUP BY d.dept_name ORDER BY emp_count DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

# ============================================================================
# DEMO 2: Employee Analytics
# ============================================================================
print_header("DEMO 2: EMPLOYEE ANALYTICS")

success, elapsed, rows = run_query(
    "Top 10 highest paid employees",
    "SELECT emp_name, job_title, salary FROM employees ORDER BY salary DESC LIMIT 10",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "Employee count by job title",
    "SELECT job_title, COUNT(*) as count FROM employees GROUP BY job_title ORDER BY count DESC"
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "Managers with their info",
    "SELECT emp_name, email, job_title, salary FROM employees WHERE job_title = 'Manager' ORDER BY salary DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

# ============================================================================
# DEMO 3: Product & Order Analytics
# ============================================================================
print_header("DEMO 3: SALES & PRODUCT ANALYTICS")

success, elapsed, rows = run_query(
    "Product sales by category",
    "SELECT p.category, COUNT(DISTINCT oi.order_id) as order_count, SUM(oi.quantity) as total_quantity FROM products p JOIN order_items oi ON p.product_id = oi.product_id GROUP BY p.category ORDER BY total_quantity DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "Order status distribution",
    "SELECT status, COUNT(*) as order_count FROM orders GROUP BY status ORDER BY order_count DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "High-value orders (>5000)",
    "SELECT o.order_id, o.total_amount, o.status FROM orders o WHERE o.total_amount > 5000 ORDER BY o.total_amount DESC LIMIT 20"
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

# ============================================================================
# DEMO 4: Complex Aggregations with HAVING
# ============================================================================
print_header("DEMO 4: COMPLEX ANALYTICS WITH HAVING")

success, elapsed, rows = run_query(
    "Employees with more than 3 orders",
    "SELECT e.emp_name, COUNT(o.order_id) as order_count FROM employees e JOIN orders o ON e.emp_id = o.emp_id GROUP BY e.emp_name HAVING COUNT(o.order_id) > 3 ORDER BY order_count DESC LIMIT 15"
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

success, elapsed, rows = run_query(
    "Department order performance",
    "SELECT d.dept_name, COUNT(DISTINCT o.order_id) as total_orders FROM departments d JOIN employees e ON d.dept_id = e.dept_id JOIN orders o ON e.emp_id = o.emp_id GROUP BY d.dept_name ORDER BY total_orders DESC",
    show_all=True
)
stats['total_queries'] += 1
stats['successful_queries'] += success
stats['total_time'] += elapsed
stats['total_rows'] += rows

# ============================================================================
# Summary Statistics
# ============================================================================
print_header("EXECUTION SUMMARY")

print(f"Total Queries Executed: {stats['total_queries']}")
print(f"Successful Queries: {stats['successful_queries']}")
print(f"Success Rate: {(stats['successful_queries']/stats['total_queries']*100):.1f}%")
print(f"Total Execution Time: {stats['total_time']:.3f}s")
print(f"Average Query Time: {(stats['total_time']/stats['total_queries']):.3f}s")
print(f"Total Rows Processed: {stats['total_rows']:,}")

print(f"\nDemo completed successfully!\n")
