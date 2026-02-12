#!/usr/bin/env python3
"""
End-to-end test for Python export feature.

Tests the complete workflow:
1. Create a flow definition
2. Save to Supabase via API
3. Export to Python code via API
4. Verify generated Python is valid
"""
import requests
import sys

API_BASE = "http://localhost:8000"

def test_python_export():
    """Test complete Python export workflow."""
    print("=" * 60)
    print("PYTHON EXPORT E2E TEST")
    print("=" * 60)

    # Step 1: Create a test flow
    print("\n[1/4] Creating test flow...")
    flow = {
        "id": "test-export-e2e",
        "name": "Python Export Test",
        "description": "Input → Agent → Output test flow",
        "nodes": [
            {
                "id": "input-1",
                "type": "input",
                "position": {"x": 0, "y": 0},
                "label": "User Input",
                "config": {
                    "input_output": {
                        "label": "Enter your question",
                        "data_type": "text"
                    }
                }
            },
            {
                "id": "agent-1",
                "type": "agent",
                "position": {"x": 300, "y": 0},
                "label": "AI Assistant",
                "config": {
                    "agent": {
                        "name": "AI Assistant",
                        "provider": "openai",
                        "model": "gpt-4o-mini",
                        "system_prompt": "You are a helpful assistant.",
                        "temperature": 0.7
                    }
                }
            },
            {
                "id": "output-1",
                "type": "output",
                "position": {"x": 600, "y": 0},
                "label": "Response",
                "config": {
                    "input_output": {
                        "label": "AI Response",
                        "data_type": "text"
                    }
                }
            }
        ],
        "edges": [
            {"id": "e1", "source": "input-1", "target": "agent-1"},
            {"id": "e2", "source": "agent-1", "target": "output-1"}
        ],
        "metadata": {
            "version": "1.0.0"
        }
    }
    print(f"✓ Flow created: {flow['name']}")
    print(f"  Nodes: {len(flow['nodes'])}")
    print(f"  Edges: {len(flow['edges'])}")

    # Step 2: Save flow via API
    print("\n[2/4] Saving flow to database...")
    response = requests.post(f"{API_BASE}/api/flows/", json=flow)

    if response.status_code != 201:
        print(f"✗ Failed to save flow: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

    saved_flow = response.json()
    flow_id = saved_flow["id"]
    print(f"✓ Flow saved with ID: {flow_id}")

    # Step 3: Export to Python
    print("\n[3/4] Exporting to Python...")
    response = requests.get(f"{API_BASE}/api/flows/{flow_id}/export/python")

    if response.status_code != 200:
        print(f"✗ Failed to export: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

    python_code = response.text
    print(f"✓ Python code generated ({len(python_code)} chars)")

    # Step 4: Verify generated Python
    print("\n[4/4] Verifying generated Python...")

    # Check essential components
    checks = [
        ("Shebang", "#!/usr/bin/env python3" in python_code),
        ("Docstring", '"""' in python_code and "Python Export Test" in python_code),
        ("Async function", "async def run_workflow" in python_code),
        ("Agno import", "from agno import Agent" in python_code),
        ("Agent config", "gpt-4o-mini" in python_code),
        ("User input", "user_input" in python_code),
        ("CLI entrypoint", 'if __name__ == "__main__"' in python_code),
        ("asyncio.run", "asyncio.run(run_workflow" in python_code),
    ]

    all_passed = True
    for check_name, passed in checks:
        status = "✓" if passed else "✗"
        print(f"  {status} {check_name}")
        if not passed:
            all_passed = False

    # Show generated code preview
    print("\n" + "=" * 60)
    print("GENERATED PYTHON CODE (first 50 lines)")
    print("=" * 60)
    lines = python_code.split('\n')
    for i, line in enumerate(lines[:50], 1):
        print(f"{i:3d} | {line}")

    if len(lines) > 50:
        print(f"... ({len(lines) - 50} more lines)")

    print("\n" + "=" * 60)

    # Cleanup
    print("\n[Cleanup] Deleting test flow...")
    requests.delete(f"{API_BASE}/api/flows/{flow_id}")
    print("✓ Test flow deleted")

    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL CHECKS PASSED")
        print("=" * 60)
        return True
    else:
        print("✗ SOME CHECKS FAILED")
        print("=" * 60)
        return False


if __name__ == "__main__":
    print("\nStarting E2E test for Python export feature...\n")
    print("Prerequisites:")
    print("  - Backend server running on http://localhost:8000")
    print("  - Supabase credentials configured in .env")
    print()

    try:
        success = test_python_export()
        sys.exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to backend server")
        print("  Start server: cd backend && uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
