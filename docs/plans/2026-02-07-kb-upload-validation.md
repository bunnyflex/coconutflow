# Knowledge Base Upload Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add content validation and UX improvements to Knowledge Base file uploads to ensure high-quality RAG documents while maintaining flexibility.

**Architecture:** Hybrid validation approach - basic content checks (readable text, size warnings) on backend, enhanced preview/guidance on frontend. Rejects binary/corrupt files but trusts users for content relevance.

**Tech Stack:** FastAPI (backend validation), React (frontend preview), python-magic (file type detection)

---

## Task 1: Backend - Add Content Validation Utilities

**Files:**
- Create: `backend/app/services/file_validator.py`
- Test: `backend/tests/test_file_validator.py`

**Step 1: Write the failing test**

```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_file_validator.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.file_validator'"

**Step 3: Write minimal implementation**

```python
"""File upload validation for Knowledge Base documents."""
from typing import Dict, List, Any


class ValidationError(Exception):
    """Raised when file validation fails."""
    pass


class FileValidator:
    """Validates uploaded files for Knowledge Base RAG."""

    SIZE_WARNING_THRESHOLD = 10 * 1024 * 1024  # 10 MB
    MIN_SIZE = 1  # At least 1 byte

    def __init__(self, content: bytes, filename: str):
        self.content = content
        self.filename = filename

    def validate(self) -> Dict[str, Any]:
        """Validate file content.

        Returns:
            dict with keys:
                - valid (bool): Whether file passes validation
                - file_type (str): Detected file type
                - warnings (list): Non-fatal warnings
                - error (str): Error message if invalid
        """
        result = {
            "valid": True,
            "file_type": "unknown",
            "warnings": [],
            "error": None,
        }

        # Check if empty
        if len(self.content) < self.MIN_SIZE:
            result["valid"] = False
            result["error"] = "File is empty"
            return result

        # Check if readable text
        if not self._is_text():
            result["valid"] = False
            result["error"] = "File is not readable text"
            return result

        result["file_type"] = "text"

        # Size warning
        if len(self.content) > self.SIZE_WARNING_THRESHOLD:
            size_mb = len(self.content) / (1024 * 1024)
            result["warnings"].append(
                f"Large file ({size_mb:.1f}MB) - embedding cost may be high"
            )

        return result

    def _is_text(self) -> bool:
        """Check if content is readable text."""
        try:
            # Try to decode as UTF-8
            self.content.decode('utf-8')
            return True
        except UnicodeDecodeError:
            # Try other common encodings
            for encoding in ['latin-1', 'iso-8859-1', 'cp1252']:
                try:
                    self.content.decode(encoding)
                    return True
                except UnicodeDecodeError:
                    continue
            return False
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_file_validator.py -v`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add backend/app/services/file_validator.py backend/tests/test_file_validator.py
git commit -m "feat: add file validation utilities for KB uploads

- Validates uploaded files are readable text
- Rejects binary/corrupt files
- Warns on large files (>10MB)
- Rejects empty files
- TDD approach with comprehensive tests"
```

---

## Task 2: Backend - Integrate Validation into Upload API

**Files:**
- Modify: `backend/app/api/upload.py:24-59`
- Test: `backend/tests/test_api.py` (add new test)

**Step 1: Write the failing test**

Add to `backend/tests/test_api.py`:

```python
class TestFileUploadValidation:
    """Test file upload validation."""

    def test_upload_binary_file_rejected(self, client):
        """Binary file should be rejected even with .txt extension."""
        binary_content = b"\x00\x01\x02\xff\xfe\xfd"

        response = client.post(
            "/api/upload/",
            files={"file": ("binary.txt", binary_content, "text/plain")},
        )

        assert response.status_code == 400
        data = response.json()
        assert "not readable text" in data["detail"].lower()

    def test_upload_empty_file_rejected(self, client):
        """Empty files should be rejected."""
        response = client.post(
            "/api/upload/",
            files={"file": ("empty.txt", b"", "text/plain")},
        )

        assert response.status_code == 400
        data = response.json()
        assert "empty" in data["detail"].lower()

    def test_upload_large_file_includes_warning(self, client):
        """Large files should return warning in response."""
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB

        response = client.post(
            "/api/upload/",
            files={"file": ("large.txt", large_content, "text/plain")},
        )

        assert response.status_code == 200
        data = response.json()
        assert "warnings" in data
        assert len(data["warnings"]) > 0
        assert "large" in data["warnings"][0].lower()
```

**Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_api.py::TestFileUploadValidation -v`
Expected: FAIL (tests not passing due to no validation in upload endpoint)

**Step 3: Update upload endpoint with validation**

In `backend/app/api/upload.py`, replace the `upload_file` function:

```python
from app.services.file_validator import FileValidator

@router.post("/")
async def upload_file(file: UploadFile) -> dict:
    """
    Upload a file for use in Knowledge Base nodes.
    Returns the file ID and metadata.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Read contents and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)} MB",
        )

    # Validate file content
    validator = FileValidator(contents, filename=file.filename)
    validation_result = validator.validate()

    if not validation_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file: {validation_result['error']}"
        )

    # Save with a unique ID
    file_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{file_id}{ext}"
    dest.write_bytes(contents)

    response = {
        "file_id": file_id,
        "filename": file.filename,
        "size": len(contents),
        "extension": ext,
        "path": str(dest),
        "file_type": validation_result["file_type"],
    }

    # Include warnings if any
    if validation_result["warnings"]:
        response["warnings"] = validation_result["warnings"]

    return response
```

**Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/test_api.py::TestFileUploadValidation -v`
Expected: PASS (all 3 tests)

**Step 5: Verify existing upload tests still pass**

Run: `cd backend && pytest tests/test_api.py::TestFileUpload -v`
Expected: PASS (existing tests unaffected)

**Step 6: Commit**

```bash
git add backend/app/api/upload.py backend/tests/test_api.py
git commit -m "feat: integrate file validation into upload API

- Reject binary/corrupt files before saving
- Reject empty files
- Return warnings for large files in response
- Add file_type to upload response
- All tests passing"
```

---

## Task 3: Update SUPABASE_SETUP.md with Validation Info

**Files:**
- Modify: `docs/SUPABASE_SETUP.md:61-75`

**Step 1: Add validation section to documentation**

In `docs/SUPABASE_SETUP.md`, after the "Using Knowledge Base Nodes" section:

```markdown
## File Upload Validation

CoconutFlow validates uploaded files to ensure quality RAG documents:

### ✅ Accepted Files
- **Text-based formats**: PDF, TXT, MD, CSV, JSON, DOCX
- **Must be readable text** (not binary or corrupt)
- **Non-empty** files only
- **Under 50MB** total size

### ⚠️ Warnings
- Files **over 10MB** will trigger a warning (higher embedding costs)
- Large files are still accepted but flagged

### ❌ Rejected Files
- **Binary files** disguised as text (e.g., executables renamed to .txt)
- **Empty files** (0 bytes)
- **Corrupt files** that can't be decoded as text
- **Unsupported formats** (e.g., .exe, .zip, .mp3)

### Example Upload Response

**Success with warning:**
```json
{
  "file_id": "abc123",
  "filename": "large-doc.pdf",
  "size": 11534336,
  "extension": ".pdf",
  "file_type": "text",
  "warnings": ["Large file (11.0MB) - embedding cost may be high"]
}
```

**Rejected (invalid):**
```json
{
  "detail": "Invalid file: File is not readable text"
}
```

### Best Practices
- **PDF**: Best for formatted documents, research papers
- **TXT/MD**: Great for plain text, notes, transcripts
- **Keep under 10MB**: Faster processing, lower costs
- **Quality over quantity**: Upload relevant documents only
```

**Step 2: Commit**

```bash
git add docs/SUPABASE_SETUP.md
git commit -m "docs: add file upload validation section to KB guide

- Document validation rules (text-based, non-empty, size limits)
- Explain warnings vs rejections
- Show example responses
- Add best practices for file uploads"
```

---

## Task 4: Update CLAUDE.md with KB Status

**Files:**
- Modify: `CLAUDE.md:122-130`

**Step 1: Update tested flow patterns**

In `CLAUDE.md`, update the Knowledge Base line:

```markdown
### Tested Flow Patterns (checked = passing)
- [x] Input → Agent → Output (basic agent call)
- [x] Input → Web Search → Output (DuckDuckGo tool)
- [x] Input → Conditional → Output-True / Output-False (branch skipping)
- [x] Chat panel execution (fallback to any node output)
- [x] Multi-agent chaining (Agent → Agent) - unit test passes, upstream context flows correctly
- [ ] Conditional with real LLM evaluation via Chat
- [~] Knowledge Base RAG pipeline - HALF-FIXED
  - [x] Backend infrastructure + Supabase setup
  - [x] File upload with validation
  - [ ] E2E testing with real documents
- [ ] Save/Load flow persistence
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark KB upload validation as complete

- File upload validation implemented and tested
- E2E testing with real documents still pending
- Pattern marked as [~] half-fixed"
```

---

## Verification Steps

After completing all tasks:

**1. Run all tests:**
```bash
cd backend
pytest tests/ -v
```
Expected: All tests pass (22+ tests)

**2. Manual verification:**
```bash
# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000

# In another terminal, test upload with curl:
echo "This is a test document for RAG." > test.txt
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test.txt"

# Should return success with file_id

# Test binary rejection:
dd if=/dev/urandom of=binary.txt bs=1024 count=1
curl -X POST http://localhost:8000/api/upload \
  -F "file=@binary.txt"

# Should return 400 error "not readable text"
```

**3. Check documentation:**
- `docs/SUPABASE_SETUP.md` has validation section
- `CLAUDE.md` shows KB as [~] half-fixed

---

## Summary

This plan implements a **hybrid validation approach** for Knowledge Base uploads:

✅ **What it does:**
- Validates files are readable text (not binary/corrupt)
- Rejects empty files
- Warns on large files (>10MB) but still accepts them
- Returns detailed validation info in API response

✅ **What it doesn't do:**
- Judge content quality/relevance (trusts users)
- Restrict file types beyond current list
- Scan for malware (out of scope)

✅ **Philosophy:**
- Trust users to upload relevant content
- Protect against obvious mistakes (binary files, empty files)
- Guide users with warnings (large files = high costs)
- Keep it simple and fast

**Total time estimate:** 30-45 minutes for full implementation
