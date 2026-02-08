"""Source type detection for Knowledge Base inputs."""
from enum import Enum
from typing import Optional


class SourceType(Enum):
    """Types of sources supported by Knowledge Base."""
    FILE = "file"
    WEBSITE = "website"
    YOUTUBE = "youtube"


class SourceDetector:
    """Detects source type from path/URL string."""

    @staticmethod
    def detect(source: str) -> SourceType:
        """Detect source type from string.

        Args:
            source: File path, website URL, or YouTube URL

        Returns:
            SourceType enum value

        Raises:
            ValueError: If source is empty or invalid
        """
        if not source or not source.strip():
            raise ValueError("Invalid source: empty string")

        source = source.strip()

        # Check for YouTube URLs
        if "youtube.com" in source or "youtu.be" in source:
            return SourceType.YOUTUBE

        # Check for HTTP/HTTPS URLs (website)
        if source.startswith("http://") or source.startswith("https://"):
            return SourceType.WEBSITE

        # Default to file path
        return SourceType.FILE
