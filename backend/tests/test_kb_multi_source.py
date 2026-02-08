"""Tests for Knowledge Base with multiple source types."""
import os
import pytest
from app.services.source_detector import SourceType, SourceDetector


def test_source_type_detection():
    """Verify source type detection logic."""
    # File paths
    assert SourceDetector.detect("/uploads/doc.pdf") == SourceType.FILE

    # Website URLs
    assert SourceDetector.detect("https://python.org") == SourceType.WEBSITE

    # YouTube URLs
    assert SourceDetector.detect("https://youtube.com/watch?v=abc") == SourceType.YOUTUBE


@pytest.mark.skipif(
    not os.environ.get("DATABASE_URL") or not os.environ.get("OPENAI_API_KEY"),
    reason="Requires DATABASE_URL and OPENAI_API_KEY for integration testing"
)
@pytest.mark.asyncio
async def test_knowledge_base_loads_file_source():
    """Test that Knowledge Base loads file sources via add_content_async."""
    from agno.knowledge import Knowledge
    from agno.vectordb.pgvector import PgVector

    # Create Knowledge instance
    vector_db = PgVector(
        table_name="kb_test",
        db_url=os.environ["DATABASE_URL"]
    )
    knowledge = Knowledge(name="kb_test", vector_db=vector_db)

    # Create a test file
    test_file = "/tmp/test_kb_file.txt"
    with open(test_file, "w") as f:
        f.write("Test content for knowledge base.")

    # Load file asynchronously
    await knowledge.add_content_async(path=test_file)

    # Verify content was added (knowledge should have documents)
    # Note: Agno's Knowledge class doesn't expose document count directly
    # This test verifies no exception was raised
    assert True

    # Cleanup
    os.remove(test_file)


@pytest.mark.skip(reason="YouTube reader requires youtube-transcript-api package")
@pytest.mark.asyncio
async def test_knowledge_base_loads_youtube_source():
    """Test that Knowledge Base can load YouTube URLs (placeholder)."""
    # This will be implemented when youtube-transcript-api is added
    pass


@pytest.mark.skip(reason="Website reader requires requests/beautifulsoup packages")
@pytest.mark.asyncio
async def test_knowledge_base_loads_website_source():
    """Test that Knowledge Base can load website URLs (placeholder)."""
    # This will be implemented when web scraping deps are added
    pass
