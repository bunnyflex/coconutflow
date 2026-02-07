"""
API router for file uploads.
Endpoint: /api/upload
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app.services.file_validator import FileValidator

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Upload directory for development
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".json", ".docx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


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
