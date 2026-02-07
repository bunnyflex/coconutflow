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
        # Check for null bytes (strong indicator of binary content)
        if b'\x00' in self.content:
            return False

        # Check for high percentage of control characters
        # (excluding common text control chars like \n, \r, \t)
        control_chars = sum(
            1 for byte in self.content
            if byte < 32 and byte not in (9, 10, 13)  # tab, LF, CR
        )
        if len(self.content) > 0 and control_chars / len(self.content) > 0.3:
            return False

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
