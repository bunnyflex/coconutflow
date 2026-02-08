"""Tests for source type detection."""
import pytest
from app.services.source_detector import SourceDetector, SourceType


def test_detect_file_path():
    """Local file paths should be detected as FILE."""
    assert SourceDetector.detect("/path/to/document.pdf") == SourceType.FILE
    assert SourceDetector.detect("./relative/path/doc.txt") == SourceType.FILE
    assert SourceDetector.detect("uploads/file.pptx") == SourceType.FILE


def test_detect_website_url():
    """HTTP/HTTPS URLs should be detected as WEBSITE."""
    assert SourceDetector.detect("https://example.com/page") == SourceType.WEBSITE
    assert SourceDetector.detect("http://docs.python.org") == SourceType.WEBSITE


def test_detect_youtube_url():
    """YouTube URLs should be detected as YOUTUBE."""
    assert SourceDetector.detect("https://youtube.com/watch?v=dQw4w9WgXcQ") == SourceType.YOUTUBE
    assert SourceDetector.detect("https://www.youtube.com/watch?v=abc123") == SourceType.YOUTUBE
    assert SourceDetector.detect("https://youtu.be/dQw4w9WgXcQ") == SourceType.YOUTUBE


def test_detect_invalid_source():
    """Invalid sources should raise ValueError."""
    with pytest.raises(ValueError, match="Invalid source"):
        SourceDetector.detect("")

    with pytest.raises(ValueError, match="Invalid source"):
        SourceDetector.detect("   ")
