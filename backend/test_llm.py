from app.services.llm_service import generate_sql

# Test 1 — basic query
print("=" * 50)
print("TEST 1: Basic query")
print("=" * 50)
result = generate_sql(
    question="Show me all students and their department names",
    schema_name="college_2"
)
print("SQL:        ", result["sql"])
print("Explanation:", result["explanation"])
print("Chart type: ", result["chart_type"])

# Test 2 — aggregation + chart
print("\n" + "=" * 50)
print("TEST 2: Aggregation with chart")
print("=" * 50)
result2 = generate_sql(
    question="How many students are in each department?",
    schema_name="college_2"
)
print("SQL:        ", result2["sql"])
print("Explanation:", result2["explanation"])
print("Chart type: ", result2["chart_type"])
print("Chart config:", result2["chart_config"])

# Test 3 — follow-up conversation
print("\n" + "=" * 50)
print("TEST 3: Follow-up question")
print("=" * 50)
result3 = generate_sql(
    question="Now show only departments with more than 5 students",
    schema_name="college_2",
    conversation_history=[
        {
            "question": "How many students are in each department?",
            "response": result2
        }
    ]
)
print("SQL:        ", result3["sql"])
print("Explanation:", result3["explanation"])
print("Chart type: ", result3["chart_type"])