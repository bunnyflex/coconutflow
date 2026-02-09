"""Tests for output normalizer service."""

from datetime import datetime
import pytest


def test_wrap_basic_output():
    """Test wrapping basic output data."""
    from app.services.output_normalizer import OutputEnvelope

    result = OutputEnvelope.wrap(
        source="firecrawl_scrape",
        data={"content": "test content"},
        metadata={"url": "https://example.com"},
        status="success"
    )

    assert result["source"] == "firecrawl_scrape"
    assert result["data"]["content"] == "test content"
    assert result["metadata"]["url"] == "https://example.com"
    assert result["status"] == "success"
    assert "timestamp" in result


def test_wrap_with_empty_metadata():
    """Test wrapping with no metadata."""
    from app.services.output_normalizer import OutputEnvelope

    result = OutputEnvelope.wrap(
        source="test_source",
        data={"key": "value"}
    )

    assert result["metadata"] == {}
    assert result["status"] == "success"


def test_wrap_timestamp_format():
    """Test timestamp is ISO 8601 format."""
    from app.services.output_normalizer import OutputEnvelope

    result = OutputEnvelope.wrap(
        source="test",
        data={}
    )

    # Verify timestamp is valid ISO format
    timestamp = result["timestamp"]
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    assert isinstance(parsed, datetime)


def test_wrap_error_status():
    """Test wrapping error responses."""
    from app.services.output_normalizer import OutputEnvelope

    result = OutputEnvelope.wrap(
        source="api_call",
        data={"error": "API rate limit exceeded"},
        status="error"
    )

    assert result["status"] == "error"
    assert result["data"]["error"] == "API rate limit exceeded"
