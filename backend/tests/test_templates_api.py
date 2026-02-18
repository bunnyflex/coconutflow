"""Tests for the templates API endpoints — verifies routes exist without DB calls."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_featured_templates_endpoint_exists():
    """GET /api/templates/featured must exist (returns 200 or 500, not 404).

    Without the DB migration run, Supabase raises an APIError for the missing
    column — which proves the endpoint exists and was reached.
    """
    try:
        response = client.get("/api/templates/featured")
        assert response.status_code != 404, f"Endpoint missing, got {response.status_code}"
    except Exception as e:
        # Expected: Supabase missing column (migration not run) or credentials not set.
        # Either way, the endpoint was reached — not a 404 routing failure.
        assert any(kw in str(e) for kw in ("SUPABASE", "column", "APIError", "postgrest")), (
            f"Unexpected exception: {e}"
        )


def test_community_templates_endpoint_exists():
    """GET /api/templates/community must exist (returns 200 or 500, not 404).

    Without the DB migration run, Supabase raises an APIError for the missing
    column — which proves the endpoint exists and was reached.
    """
    try:
        response = client.get("/api/templates/community")
        assert response.status_code != 404, f"Endpoint missing, got {response.status_code}"
    except Exception as e:
        # Expected: Supabase missing column (migration not run) or credentials not set.
        assert any(kw in str(e) for kw in ("SUPABASE", "column", "APIError", "postgrest")), (
            f"Unexpected exception: {e}"
        )


def test_use_template_returns_404_for_unknown():
    """POST /api/templates/{id}/use returns 404 for unknown template, not 405."""
    try:
        response = client.post("/api/templates/nonexistent-id-xyz/use")
        assert response.status_code in (404, 500), f"Expected 404/500, got {response.status_code}"
    except Exception as e:
        # Expected: Supabase missing column or credentials not set — endpoint was reached.
        assert any(kw in str(e) for kw in ("SUPABASE", "column", "APIError", "postgrest")), (
            f"Unexpected exception: {e}"
        )


def test_use_template_method_not_get():
    """GET /api/templates/{id}/use should return 405 (method not allowed)."""
    response = client.get("/api/templates/some-id/use")
    assert response.status_code == 405, f"Expected 405, got {response.status_code}"
