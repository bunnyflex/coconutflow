"""Output normalizer for consistent external service responses."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class OutputEnvelope:
    """
    Normalized output wrapper for all external service responses.

    Provides consistent data format for downstream node composability.
    All external integrations (Firecrawl, Apify, MCP, Hugging Face)
    wrap their responses using this envelope.
    """

    @staticmethod
    def wrap(
        source: str,
        data: Any,
        metadata: dict[str, Any] | None = None,
        status: str = "success",
    ) -> dict[str, Any]:
        """
        Wrap service response in normalized envelope.

        Args:
            source: Service identifier (e.g., "firecrawl_scrape", "apify_actor")
            data: Service-specific payload
            metadata: Optional metadata (e.g., URL, status codes, timing)
            status: Response status ("success", "error", "partial")

        Returns:
            Normalized envelope dict with standard structure

        Example:
            >>> OutputEnvelope.wrap(
            ...     source="firecrawl_scrape",
            ...     data={"markdown": "# Hello"},
            ...     metadata={"url": "https://example.com"}
            ... )
            {
                "source": "firecrawl_scrape",
                "timestamp": "2026-02-09T12:34:56.789Z",
                "data": {"markdown": "# Hello"},
                "metadata": {"url": "https://example.com"},
                "status": "success"
            }
        """
        return {
            "source": source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
            "metadata": metadata or {},
            "status": status,
        }
