"""Source type detection for Knowledge Base inputs."""
from enum import Enum
from urllib.parse import urlparse


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

        # Check for HTTP/HTTPS URLs first
        if source.startswith(("http://", "https://")):
            parsed = urlparse(source)
            if not parsed.netloc:
                raise ValueError(f"Invalid URL: missing domain in '{source}'")

            # Check if it's a YouTube URL by domain
            if parsed.netloc in ("youtube.com", "www.youtube.com", "youtu.be"):
                return SourceType.YOUTUBE

            return SourceType.WEBSITE

        # Default to file path
        return SourceType.FILE
