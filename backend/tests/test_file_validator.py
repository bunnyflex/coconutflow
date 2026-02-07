"""Tests for file upload validation."""
import pytest
from app.services.file_validator import FileValidator, ValidationError


def test_validate_text_file_success():
    """Valid text file should pass validation."""
    content = b"This is a valid text document for RAG.\nIt has multiple lines."
    validator = FileValidator(content, filename="test.txt")

    result = validator.validate()

    assert result["valid"] is True
    assert result["file_type"] == "text"
    assert result["warnings"] == []


def test_validate_binary_file_fails():
    """Binary file disguised as .txt should fail."""
    content = b"\x00\x01\x02\xff\xfe\xfd"  # Binary data
    validator = FileValidator(content, filename="fake.txt")

    result = validator.validate()

    assert result["valid"] is False
    assert "not readable text" in result["error"].lower()


def test_validate_large_file_warns():
    """Files over 10MB should get size warning."""
    content = b"x" * (11 * 1024 * 1024)  # 11MB
    validator = FileValidator(content, filename="large.txt")

    result = validator.validate()

    assert result["valid"] is True
    assert any("large" in w.lower() for w in result["warnings"])


def test_validate_empty_file_fails():
    """Empty files should fail validation."""
    content = b""
    validator = FileValidator(content, filename="empty.txt")

    result = validator.validate()

    assert result["valid"] is False
    assert "empty" in result["error"].lower()
