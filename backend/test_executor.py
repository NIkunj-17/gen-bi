from app.services.sql_executor import execute_query, is_safe_query

# Test 1 — valid query
print("=" * 50)
print("TEST 1: Valid query")
print("=" * 50)
result = execute_query(
    "SELECT dept_name, COUNT(*) as total FROM college_2.student GROUP BY dept_name"
)
print("Success:", result["success"])
print("Rows:   ", result["row_count"])
print("Data:   ", result["data"][:3])  # show first 3 rows

# Test 2 — safety check blocks DROP
print("\n" + "=" * 50)
print("TEST 2: Safety check")
print("=" * 50)
result2 = execute_query("DROP TABLE college_2.student")
print("Success:", result2["success"])
print("Error:  ", result2["error"])

# Test 3 — safety check blocks DELETE
print("\n" + "=" * 50)
print("TEST 3: Block DELETE")
print("=" * 50)
safe, reason = is_safe_query("DELETE FROM college_2.student WHERE id=1")
print("Is safe:", safe)
print("Reason: ", reason)