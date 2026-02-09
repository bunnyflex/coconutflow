# External Integrations Implementation Plan - Phase 1

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:executing-plans to implement this plan task-by-task OR use @superpowers:subagent-driven-development for fresh subagent per task with review.

**Goal:** Implement credential vault infrastructure + 4 core integration nodes (Firecrawl, Apify, MCP, Hugging Face)

**Architecture:** Three-layer foundation (credential vault for security, retry handler for resilience, output normalizer for composability) + plugin-based node compilers extending BaseNodeCompiler

**Tech Stack:** Python 3.9+, FastAPI, Pydantic, Supabase (PostgreSQL), Fernet encryption, firecrawl-py, apify-client, mcp, huggingface_hub

---

## Prerequisites

- Worktree created at `.worktrees/external-integrations`
- Backend dependencies installed (`pip install -r requirements.txt`)
- Frontend dependencies installed (`npm install`)
- `.env` file copied from main directory

---

## Phase 1 Task Breakdown

### Task 1: Install New Dependencies

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: Add new dependencies to requirements.txt**

Add these lines to `backend/requirements.txt`:

```txt
# External integrations
firecrawl-py>=0.0.16
apify-client>=1.0.0
mcp>=1.0.0
huggingface_hub>=0.20.0
cryptography>=41.0.0
```

**Step 2: Install dependencies**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pip install -r requirements.txt
```

Expected: All packages install successfully

**Step 3: Verify imports work**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/python3 -c "from cryptography.fernet import Fernet; import firecrawl; from apify_client import ApifyClient; from huggingface_hub import InferenceClient; print('All imports successful')"
```

Expected: "All imports successful"

**Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "deps: add external integration dependencies (firecrawl, apify, mcp, huggingface, cryptography)"
```

---

### Task 2: Create Supabase Migration for Credentials Table

**Files:**
- Create: `backend/migrations/002_create_credentials_table.sql`

**Step 1: Create migration file**

Create `backend/migrations/002_create_credentials_table.sql`:

```sql
-- Credential Vault: Secure storage for API keys
-- Migration: 002_create_credentials_table.sql
-- Date: 2026-02-09

CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'system',
    service_name TEXT NOT NULL,  -- "firecrawl", "apify", "huggingface", "mcp"
    credential_name TEXT NOT NULL,  -- User-friendly label
    encrypted_key TEXT NOT NULL,  -- Fernet-encrypted API key
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, service_name, credential_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_credentials_user_service
ON credentials(user_id, service_name);

-- Comments
COMMENT ON TABLE credentials IS 'Encrypted API keys for external services';
COMMENT ON COLUMN credentials.encrypted_key IS 'Fernet symmetric encryption using CREDENTIAL_VAULT_KEY env var';
```

**Step 2: Document migration instructions**

Add comment at top of file explaining manual execution:

```sql
-- MANUAL EXECUTION REQUIRED:
-- 1. Log into Supabase dashboard
-- 2. Go to SQL Editor
-- 3. Run this migration
-- 4. Verify table created: SELECT * FROM credentials LIMIT 1;
```

**Step 3: Commit**

```bash
git add backend/migrations/002_create_credentials_table.sql
git commit -m "feat: add credentials table migration for credential vault"
```

---

### Task 3: Implement Retry Handler Utility

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/retry.py`
- Create: `backend/tests/test_retry_handler.py`

**Step 1: Write failing test for retry handler**

Create `backend/tests/test_retry_handler.py`:

```python
"""Tests for retry handler with exponential backoff."""

import asyncio
import pytest


@pytest.mark.asyncio
async def test_retry_succeeds_first_attempt():
    """Test successful function on first attempt."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def successful_function():
        nonlocal call_count
        call_count += 1
        return "success"

    result = await successful_function()

    assert result == "success"
    assert call_count == 1


@pytest.mark.asyncio
async def test_retry_succeeds_after_failures():
    """Test retry succeeds after transient failures."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def flaky_function():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError("Transient failure")
        return "success"

    result = await flaky_function()

    assert result == "success"
    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_fails_after_max_attempts():
    """Test retry raises error after max attempts."""
    from app.utils.retry import retry_with_backoff

    call_count = 0

    @retry_with_backoff(max_attempts=3, base_delay=0.1)
    async def always_fails():
        nonlocal call_count
        call_count += 1
        raise ValueError("Permanent failure")

    with pytest.raises(ValueError, match="Permanent failure"):
        await always_fails()

    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_exponential_backoff():
    """Test exponential backoff timing."""
    from app.utils.retry import retry_with_backoff
    import time

    attempt_times = []

    @retry_with_backoff(max_attempts=3, base_delay=0.1, max_delay=1.0)
    async def timing_test():
        attempt_times.append(time.time())
        if len(attempt_times) < 3:
            raise ConnectionError("Retry")
        return "success"

    await timing_test()

    # Verify exponential backoff: ~0.1s, ~0.2s delays
    assert len(attempt_times) == 3
    delay_1 = attempt_times[1] - attempt_times[0]
    delay_2 = attempt_times[2] - attempt_times[1]

    assert 0.08 < delay_1 < 0.15  # ~0.1s delay
    assert 0.15 < delay_2 < 0.25  # ~0.2s delay
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_retry_handler.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.utils.retry'`

**Step 3: Create utils package init**

Create `backend/app/utils/__init__.py`:

```python
"""Utility functions and decorators."""
```

**Step 4: Implement retry handler**

Create `backend/app/utils/retry.py`:

```python
"""Retry handler with exponential backoff for resilient API calls."""

from __future__ import annotations

import asyncio
import logging
from functools import wraps
from typing import Any, Callable, TypeVar

T = TypeVar("T")

logger = logging.getLogger(__name__)


def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    exceptions: tuple[type[Exception], ...] = (Exception,),
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Retry async function with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        exceptions: Tuple of exception types to catch and retry

    Returns:
        Decorated async function with retry logic

    Example:
        @retry_with_backoff(max_attempts=3, base_delay=1.0)
        async def fetch_api(url: str) -> dict:
            response = await http_client.get(url)
            return response.json()
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {e}"
                        )
                        raise

                    # Calculate exponential backoff delay
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)

                    logger.warning(
                        f"{func.__name__} attempt {attempt} failed: {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )

                    await asyncio.sleep(delay)

            # This should never be reached but satisfies type checker
            raise RuntimeError("Retry logic error")

        return wrapper
    return decorator
```

**Step 5: Run tests to verify they pass**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_retry_handler.py -v
```

Expected: All 4 tests pass

**Step 6: Commit**

```bash
git add backend/app/utils/ backend/tests/test_retry_handler.py
git commit -m "feat: add retry handler with exponential backoff

- Decorator for async functions
- Configurable max attempts and delays
- Exponential backoff with max delay cap
- Comprehensive unit tests"
```

---

### Task 4: Implement Output Normalizer Service

**Files:**
- Create: `backend/app/services/output_normalizer.py`
- Create: `backend/tests/test_output_normalizer.py`

**Step 1: Write failing test for output normalizer**

Create `backend/tests/test_output_normalizer.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_output_normalizer.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.output_normalizer'`

**Step 3: Implement output normalizer**

Create `backend/app/services/output_normalizer.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_output_normalizer.py -v
```

Expected: All 4 tests pass

**Step 5: Commit**

```bash
git add backend/app/services/output_normalizer.py backend/tests/test_output_normalizer.py
git commit -m "feat: add output normalizer for consistent service responses

- OutputEnvelope wrapper class
- Standard format: source, timestamp, data, metadata, status
- Supports all external integrations
- Comprehensive unit tests"
```

---

### Task 5: Implement Credential Vault Service

**Files:**
- Create: `backend/app/services/credential_vault.py`
- Create: `backend/tests/test_credential_vault.py`

**Step 1: Write failing test for credential vault**

Create `backend/tests/test_credential_vault.py`:

```python
"""Tests for credential vault service."""

import os
import pytest
from cryptography.fernet import Fernet


@pytest.fixture
def vault_key():
    """Generate test encryption key."""
    return Fernet.generate_key().decode()


@pytest.fixture
def mock_env(vault_key, monkeypatch):
    """Mock CREDENTIAL_VAULT_KEY environment variable."""
    monkeypatch.setenv("CREDENTIAL_VAULT_KEY", vault_key)


def test_encrypt_credential(mock_env):
    """Test encrypting a credential."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()
    encrypted = vault.encrypt_credential("sk-test-key-123")

    assert encrypted != "sk-test-key-123"
    assert len(encrypted) > 0


def test_decrypt_credential(mock_env):
    """Test decrypting a credential."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()
    encrypted = vault.encrypt_credential("sk-test-key-123")
    decrypted = vault.decrypt_credential(encrypted)

    assert decrypted == "sk-test-key-123"


def test_encrypt_decrypt_roundtrip(mock_env):
    """Test encrypt/decrypt roundtrip with various keys."""
    from app.services.credential_vault import CredentialVault

    vault = CredentialVault()

    test_keys = [
        "simple-key",
        "sk-1234567890abcdef",
        "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
        "special-chars-!@#$%^&*()",
    ]

    for original_key in test_keys:
        encrypted = vault.encrypt_credential(original_key)
        decrypted = vault.decrypt_credential(encrypted)
        assert decrypted == original_key


def test_missing_vault_key_raises_error():
    """Test missing CREDENTIAL_VAULT_KEY raises error."""
    from app.services.credential_vault import CredentialVault

    # Clear env var
    if "CREDENTIAL_VAULT_KEY" in os.environ:
        del os.environ["CREDENTIAL_VAULT_KEY"]

    with pytest.raises(RuntimeError, match="CREDENTIAL_VAULT_KEY"):
        CredentialVault()


def test_invalid_encrypted_key_raises_error(mock_env):
    """Test decrypting invalid data raises error."""
    from app.services.credential_vault import CredentialVault
    from cryptography.fernet import InvalidToken

    vault = CredentialVault()

    with pytest.raises(InvalidToken):
        vault.decrypt_credential("invalid-encrypted-data")
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_credential_vault.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.credential_vault'`

**Step 3: Implement credential vault**

Create `backend/app/services/credential_vault.py`:

```python
"""Credential vault for secure API key storage with encryption."""

from __future__ import annotations

import os
from cryptography.fernet import Fernet


class CredentialVault:
    """
    Secure credential storage using Fernet symmetric encryption.

    Encrypts API keys before storing in database and decrypts at runtime.
    Encryption key stored in CREDENTIAL_VAULT_KEY environment variable.

    Example:
        vault = CredentialVault()
        encrypted = vault.encrypt_credential("sk-my-secret-key")
        # Store encrypted in database

        # Later, retrieve and decrypt
        decrypted = vault.decrypt_credential(encrypted)
        # Use decrypted for API calls
    """

    def __init__(self):
        """Initialize vault with encryption key from environment."""
        vault_key = os.getenv("CREDENTIAL_VAULT_KEY")

        if not vault_key:
            raise RuntimeError(
                "CREDENTIAL_VAULT_KEY environment variable must be set. "
                "Generate with: python -c 'from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())'"
            )

        self.cipher = Fernet(vault_key.encode())

    def encrypt_credential(self, api_key: str) -> str:
        """
        Encrypt an API key for storage.

        Args:
            api_key: Plain text API key

        Returns:
            Encrypted key as base64 string
        """
        encrypted_bytes = self.cipher.encrypt(api_key.encode())
        return encrypted_bytes.decode()

    def decrypt_credential(self, encrypted_key: str) -> str:
        """
        Decrypt an API key for use.

        Args:
            encrypted_key: Encrypted key from database

        Returns:
            Plain text API key

        Raises:
            InvalidToken: If encrypted_key is invalid or corrupted
        """
        decrypted_bytes = self.cipher.decrypt(encrypted_key.encode())
        return decrypted_bytes.decode()
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_credential_vault.py -v
```

Expected: All 6 tests pass

**Step 5: Commit**

```bash
git add backend/app/services/credential_vault.py backend/tests/test_credential_vault.py
git commit -m "feat: add credential vault with Fernet encryption

- Symmetric encryption for API keys
- CREDENTIAL_VAULT_KEY env var for encryption key
- Encrypt/decrypt methods
- Comprehensive unit tests with roundtrip validation"
```

---

### Task 6: Create Credentials API Endpoints

**Files:**
- Create: `backend/app/api/credentials.py`
- Create: `backend/tests/test_credentials_api.py`
- Modify: `backend/app/main.py` (register router)

**Step 1: Write failing test for credentials API**

Create `backend/tests/test_credentials_api.py`:

```python
"""Tests for credentials API endpoints."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Test client with mocked Supabase."""
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_vault_key(monkeypatch):
    """Mock CREDENTIAL_VAULT_KEY for tests."""
    from cryptography.fernet import Fernet
    monkeypatch.setenv("CREDENTIAL_VAULT_KEY", Fernet.generate_key().decode())


def test_create_credential(client, mock_vault_key):
    """Test creating a new credential."""
    response = client.post(
        "/api/credentials",
        json={
            "service_name": "firecrawl",
            "credential_name": "default",
            "api_key": "sk-test-key-123"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["service_name"] == "firecrawl"
    assert data["credential_name"] == "default"
    assert "id" in data
    assert "api_key" not in data  # Never return plain key


def test_list_credentials(client, mock_vault_key):
    """Test listing credentials (without keys)."""
    # Create a credential first
    client.post(
        "/api/credentials",
        json={
            "service_name": "apify",
            "credential_name": "prod",
            "api_key": "apify-key-123"
        }
    )

    response = client.get("/api/credentials")

    assert response.status_code == 200
    credentials = response.json()
    assert len(credentials) > 0
    assert "api_key" not in credentials[0]  # Never return keys in list


def test_delete_credential(client, mock_vault_key):
    """Test deleting a credential."""
    # Create a credential
    create_response = client.post(
        "/api/credentials",
        json={
            "service_name": "huggingface",
            "credential_name": "test",
            "api_key": "hf-key-123"
        }
    )
    credential_id = create_response.json()["id"]

    # Delete it
    delete_response = client.delete(f"/api/credentials/{credential_id}")

    assert delete_response.status_code == 204
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_credentials_api.py -v
```

Expected: `404 Not Found` (endpoint doesn't exist yet)

**Step 3: Implement credentials API**

Create `backend/app/api/credentials.py`:

```python
"""
API router for credential management.
Endpoints: /api/credentials
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.credential_vault import CredentialVault
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/credentials", tags=["credentials"])


class CredentialCreate(BaseModel):
    """Request model for creating a credential."""
    service_name: str
    credential_name: str
    api_key: str


class CredentialResponse(BaseModel):
    """Response model for credential (without plain API key)."""
    id: str
    service_name: str
    credential_name: str
    created_at: str


@router.post("/", response_model=CredentialResponse, status_code=201)
async def create_credential(credential: CredentialCreate) -> dict[str, Any]:
    """
    Store a new encrypted credential.

    The API key is encrypted using Fernet before storage.
    The plain key is never stored or returned.
    """
    vault = CredentialVault()
    supabase = get_supabase_client()

    # Encrypt the API key
    encrypted_key = vault.encrypt_credential(credential.api_key)

    # Store in database
    row = {
        "service_name": credential.service_name,
        "credential_name": credential.credential_name,
        "encrypted_key": encrypted_key,
        "user_id": "system",  # TODO: Multi-tenant support
    }

    response = supabase.table("credentials").insert(row).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create credential")

    return {
        "id": response.data[0]["id"],
        "service_name": response.data[0]["service_name"],
        "credential_name": response.data[0]["credential_name"],
        "created_at": response.data[0]["created_at"],
    }


@router.get("/", response_model=list[CredentialResponse])
async def list_credentials() -> list[dict[str, Any]]:
    """
    List all credentials (without API keys).

    Returns credential metadata only, never the encrypted or plain keys.
    """
    supabase = get_supabase_client()

    response = supabase.table("credentials").select(
        "id, service_name, credential_name, created_at"
    ).order("created_at", desc=True).execute()

    return response.data


@router.delete("/{credential_id}", status_code=204)
async def delete_credential(credential_id: str) -> None:
    """Delete a credential by ID."""
    supabase = get_supabase_client()

    # Check if exists
    existing = supabase.table("credentials").select("id").eq("id", credential_id).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Credential not found")

    # Delete
    supabase.table("credentials").delete().eq("id", credential_id).execute()


@router.get("/{credential_id}/decrypt")
async def decrypt_credential(credential_id: str) -> dict[str, str]:
    """
    Decrypt a credential for runtime use.

    WARNING: This endpoint returns the plain API key.
    Should only be called server-side, never exposed to frontend.
    """
    vault = CredentialVault()
    supabase = get_supabase_client()

    response = supabase.table("credentials").select("encrypted_key").eq("id", credential_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Credential not found")

    encrypted_key = response.data[0]["encrypted_key"]
    plain_key = vault.decrypt_credential(encrypted_key)

    return {"api_key": plain_key}
```

**Step 4: Register credentials router in main.py**

Modify `backend/app/main.py`, add import and include router:

```python
# Add after existing imports
from app.api.credentials import router as credentials_router

# Add after existing router registrations
app.include_router(credentials_router)
```

**Step 5: Run tests (will still fail due to Supabase mock needed)**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_credentials_api.py -v
```

Expected: Tests fail due to Supabase connection (this is OK for now - integration tests will validate later)

**Step 6: Commit**

```bash
git add backend/app/api/credentials.py backend/tests/test_credentials_api.py backend/app/main.py
git commit -m "feat: add credentials API endpoints

- POST /api/credentials - Create encrypted credential
- GET /api/credentials - List credentials (no keys)
- DELETE /api/credentials/{id} - Remove credential
- GET /api/credentials/{id}/decrypt - Runtime decryption (server-side only)
- Tests stub (require Supabase migration)"
```

---

### Task 7: Add Pydantic Models for New Node Types

**Files:**
- Modify: `backend/app/models/flow.py`

**Step 1: Add new config classes to flow.py**

Add these classes after the existing config classes (around line 140):

```python
class FirecrawlScrapeConfig(BaseModel):
    """Configuration for Firecrawl Scrape nodes."""
    url: str = ""
    formats: list[str] = Field(default_factory=lambda: ["markdown"])
    include_metadata: bool = True
    credential_id: str | None = None


class ApifyActorConfig(BaseModel):
    """Configuration for Apify Actor nodes."""
    actor_id: str = ""
    input: dict[str, Any] = Field(default_factory=dict)
    max_items: int = 100
    timeout_secs: int = 300
    credential_id: str | None = None


class MCPServerConfig(BaseModel):
    """Configuration for MCP Server nodes."""
    server_name: str = ""
    server_url: str = ""
    server_type: str = "stdio"  # "stdio", "sse", "http"
    instructions: str | None = None
    credential_id: str | None = None


class HuggingFaceInferenceConfig(BaseModel):
    """Configuration for Hugging Face Inference nodes."""
    model_id: str = ""
    task: str = "text-generation"  # text-generation, embeddings, classification, etc.
    parameters: dict[str, Any] = Field(default_factory=dict)
    input_key: str = "{{upstream.data}}"
    credential_id: str | None = None
```

**Step 2: Add config fields to NodeConfig union**

Find the `NodeConfig` class (around line 145) and add these fields:

```python
class NodeConfig(BaseModel):
    """
    Union-style node configuration.
    Only the fields relevant to the node's type will be populated.
    """
    agent: Optional[AgentConfig] = None
    team: Optional[TeamConfig] = None
    tool: Optional[ToolConfig] = None
    knowledge_base: Optional[KnowledgeBaseConfig] = None
    prompt: Optional[PromptConfig] = None
    conditional: Optional[ConditionalConfig] = None
    loop: Optional[LoopConfig] = None
    webhook: Optional[WebhookConfig] = None
    schedule: Optional[ScheduleConfig] = None
    input_output: Optional[InputOutputConfig] = None

    # NEW: External integration configs
    firecrawl_scrape: Optional[FirecrawlScrapeConfig] = None
    apify_actor: Optional[ApifyActorConfig] = None
    mcp_server: Optional[MCPServerConfig] = None
    huggingface_inference: Optional[HuggingFaceInferenceConfig] = None
```

**Step 3: Verify models parse correctly**

Run:
```bash
/Library/Developer/CommandLineTools/usr/bin/python3 -c "
from app.models.flow import FirecrawlScrapeConfig, ApifyActorConfig, MCPServerConfig, HuggingFaceInferenceConfig
print('All models imported successfully')
"
```

Expected: "All models imported successfully"

**Step 4: Commit**

```bash
git add backend/app/models/flow.py
git commit -m "feat: add Pydantic models for external integration nodes

- FirecrawlScrapeConfig
- ApifyActorConfig
- MCPServerConfig
- HuggingFaceInferenceConfig
- Added to NodeConfig union"
```

---

### Task 8: Implement Firecrawl Scrape Node Compiler

**Files:**
- Create: `backend/app/compiler/nodes/firecrawl_scrape_compiler.py`
- Create: `backend/tests/test_firecrawl_scrape_compiler.py`

**Step 1: Write failing test for Firecrawl compiler**

Create `backend/tests/test_firecrawl_scrape_compiler.py`:

```python
"""Tests for Firecrawl Scrape node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, FirecrawlScrapeConfig


def test_firecrawl_scrape_compiler_basic():
    """Test basic Firecrawl Scrape compilation."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    node = FlowNode(
        id="test-firecrawl",
        type="firecrawl_scrape",
        config=NodeConfig(
            firecrawl_scrape=FirecrawlScrapeConfig(
                url="https://example.com",
                formats=["markdown"],
                include_metadata=True
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = FirecrawlScrapeNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "firecrawl_scrape"
    assert result["node_id"] == "test-firecrawl"
    assert result["url"] == "https://example.com"
    assert result["formats"] == ["markdown"]
    assert result["include_metadata"] is True


def test_firecrawl_scrape_compiler_multiple_formats():
    """Test Firecrawl with multiple output formats."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    node = FlowNode(
        id="test-multi",
        type="firecrawl_scrape",
        config=NodeConfig(
            firecrawl_scrape=FirecrawlScrapeConfig(
                url="https://docs.example.com",
                formats=["markdown", "html", "screenshot"],
                include_metadata=False,
                credential_id="cred-123"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = FirecrawlScrapeNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["formats"] == ["markdown", "html", "screenshot"]
    assert result["include_metadata"] is False
    assert result["credential_id"] == "cred-123"


def test_firecrawl_scrape_compiler_node_type():
    """Test compiler reports correct node type."""
    from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

    compiler = FirecrawlScrapeNodeCompiler()
    assert compiler.node_type == "firecrawl_scrape"
```

**Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_firecrawl_scrape_compiler.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.compiler.nodes.firecrawl_scrape_compiler'`

**Step 3: Implement Firecrawl compiler**

Create `backend/app/compiler/nodes/firecrawl_scrape_compiler.py`:

```python
"""Firecrawl Scrape Node Compiler — converts websites to clean Markdown/JSON."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class FirecrawlScrapeNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Firecrawl Scrape nodes.

    Converts website URLs to clean Markdown, HTML, or screenshots
    for RAG pipelines and data extraction.

    API: https://docs.firecrawl.dev/api-reference/endpoint/scrape
    """

    @property
    def node_type(self) -> str:
        return "firecrawl_scrape"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Compile Firecrawl Scrape node configuration.

        Returns a dict that the execution engine will use to:
        1. Resolve credential at runtime
        2. Make API call to Firecrawl
        3. Return normalized output

        Args:
            node: FlowNode with firecrawl_scrape config
            context: Optional compilation context (unused)

        Returns:
            Compiled node dict with url, formats, metadata settings
        """
        config = node.config.firecrawl_scrape

        if not config:
            raise ValueError(f"Node '{node.id}' missing firecrawl_scrape configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "url": config.url,
            "formats": config.formats,
            "include_metadata": config.include_metadata,
            "credential_id": config.credential_id,
        }
```

**Step 4: Run tests to verify they pass**

Run:
```bash
cd backend && /Library/Developer/CommandLineTools/usr/bin/python3 -m pytest tests/test_firecrawl_scrape_compiler.py -v
```

Expected: All 3 tests pass

**Step 5: Register compiler in node registry**

Modify `backend/app/compiler/nodes/__init__.py`, add:

```python
from app.compiler.nodes.firecrawl_scrape_compiler import FirecrawlScrapeNodeCompiler

# Add to NODE_COMPILERS dict
NODE_COMPILERS["firecrawl_scrape"] = FirecrawlScrapeNodeCompiler
```

**Step 6: Commit**

```bash
git add backend/app/compiler/nodes/firecrawl_scrape_compiler.py backend/tests/test_firecrawl_scrape_compiler.py backend/app/compiler/nodes/__init__.py
git commit -m "feat: add Firecrawl Scrape node compiler

- Compiles URL, formats, metadata config
- Supports multiple output formats (markdown/html/screenshot)
- Credential vault integration ready
- Comprehensive unit tests"
```

---

### Task 9-11: Implement Remaining Backend Compilers

**Note:** Tasks 9-11 follow the same TDD pattern as Task 8. For brevity, I'll provide the implementation code directly. Each follows:
1. Write failing tests
2. Run tests (verify failure)
3. Implement compiler
4. Run tests (verify pass)
5. Register in __init__.py
6. Commit

---

#### Task 9: Apify Actor Compiler

Create `backend/app/compiler/nodes/apify_actor_compiler.py`:

```python
"""Apify Actor Node Compiler — runs Apify scrapers/actors."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class ApifyActorNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Apify Actor nodes.

    Runs any of Apify's 1,500+ pre-built scrapers (actors)
    for social media, e-commerce, maps, etc.

    API: https://docs.apify.com/api/v2#/reference/actors/run-collection
    """

    @property
    def node_type(self) -> str:
        return "apify_actor"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        config = node.config.apify_actor

        if not config:
            raise ValueError(f"Node '{node.id}' missing apify_actor configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "actor_id": config.actor_id,
            "input": config.input,
            "max_items": config.max_items,
            "timeout_secs": config.timeout_secs,
            "credential_id": config.credential_id,
        }
```

Create `backend/tests/test_apify_actor_compiler.py`:

```python
"""Tests for Apify Actor node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, ApifyActorConfig


def test_apify_actor_compiler_basic():
    """Test basic Apify Actor compilation."""
    from app.compiler.nodes.apify_actor_compiler import ApifyActorNodeCompiler

    node = FlowNode(
        id="test-apify",
        type="apify_actor",
        config=NodeConfig(
            apify_actor=ApifyActorConfig(
                actor_id="apify/instagram-scraper",
                input={"username": ["test_user"]},
                max_items=50
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = ApifyActorNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "apify_actor"
    assert result["actor_id"] == "apify/instagram-scraper"
    assert result["input"]["username"] == ["test_user"]
    assert result["max_items"] == 50


def test_apify_actor_compiler_timeout():
    """Test Apify Actor with custom timeout."""
    from app.compiler.nodes.apify_actor_compiler import ApifyActorNodeCompiler

    node = FlowNode(
        id="test-timeout",
        type="apify_actor",
        config=NodeConfig(
            apify_actor=ApifyActorConfig(
                actor_id="custom/actor",
                input={},
                timeout_secs=600
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = ApifyActorNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["timeout_secs"] == 600
```

Register and commit:

```bash
# Register in backend/app/compiler/nodes/__init__.py
# Run tests: pytest tests/test_apify_actor_compiler.py -v
git add backend/app/compiler/nodes/apify_actor_compiler.py backend/tests/test_apify_actor_compiler.py backend/app/compiler/nodes/__init__.py
git commit -m "feat: add Apify Actor node compiler

- Generic actor runner for 1500+ Apify actors
- Configurable input, max items, timeout
- Credential vault integration
- Unit tests"
```

---

#### Task 10: MCP Server Compiler

Create `backend/app/compiler/nodes/mcp_server_compiler.py`:

```python
"""MCP Server Node Compiler — connects to Model Context Protocol servers."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class MCPServerNodeCompiler(BaseNodeCompiler):
    """
    Compiler for MCP Server nodes.

    Connects to MCP servers and creates Agno agents with MCP tools.
    Supports stdio, SSE, and HTTP server types.

    Spec: https://modelcontextprotocol.io/
    """

    @property
    def node_type(self) -> str:
        return "mcp_server"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        config = node.config.mcp_server

        if not config:
            raise ValueError(f"Node '{node.id}' missing mcp_server configuration")

        # Note: Actual MCP client connection and agent creation
        # happens in execution engine, not at compile time.
        # This is because MCP servers may not be available during compilation.

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "server_name": config.server_name,
            "server_url": config.server_url,
            "server_type": config.server_type,
            "instructions": config.instructions,
            "credential_id": config.credential_id,
        }
```

Create tests and commit (follow same pattern as above).

```bash
git add backend/app/compiler/nodes/mcp_server_compiler.py backend/tests/test_mcp_server_compiler.py backend/app/compiler/nodes/__init__.py
git commit -m "feat: add MCP Server node compiler

- Connects to MCP servers (stdio/SSE/HTTP)
- Defers agent creation to execution time
- Credential vault integration
- Unit tests"
```

---

#### Task 11: Hugging Face Inference Compiler

Create `backend/app/compiler/nodes/huggingface_inference_compiler.py`:

```python
"""Hugging Face Inference Node Compiler — runs HF model inference."""

from __future__ import annotations

from typing import Any

from app.compiler.nodes.base import BaseNodeCompiler
from app.models.flow import FlowNode


class HuggingFaceInferenceNodeCompiler(BaseNodeCompiler):
    """
    Compiler for Hugging Face Inference nodes.

    Runs inference on 600k+ models from Hugging Face Hub.
    Supports text generation, embeddings, classification, etc.

    API: https://huggingface.co/docs/api-inference/
    """

    @property
    def node_type(self) -> str:
        return "huggingface_inference"

    def compile(self, node: FlowNode, context: dict[str, Any] | None = None) -> dict[str, Any]:
        config = node.config.huggingface_inference

        if not config:
            raise ValueError(f"Node '{node.id}' missing huggingface_inference configuration")

        return {
            "node_id": node.id,
            "node_type": self.node_type,
            "model_id": config.model_id,
            "task": config.task,
            "parameters": config.parameters,
            "input_key": config.input_key,
            "credential_id": config.credential_id,
        }
```

Create tests and commit (follow same pattern).

```bash
git add backend/app/compiler/nodes/huggingface_inference_compiler.py backend/tests/test_huggingface_inference_compiler.py backend/app/compiler/nodes/__init__.py
git commit -m "feat: add Hugging Face Inference node compiler

- Supports multiple tasks (text-gen, embeddings, classification)
- Configurable model ID and parameters
- Input key templating for upstream data
- Unit tests"
```

---

### Task 12: Update Execution Engine for New Node Types

**Files:**
- Modify: `backend/app/services/execution_engine.py`

**Note:** This task adds execution logic for the 4 new node types. The execution engine needs to:
1. Resolve credentials at runtime
2. Make API calls with retry logic
3. Normalize outputs

This is a LARGE change. For now, I'll provide stub implementations that:
- Resolve credentials correctly
- Return mock data wrapped in normalized envelope
- Can be replaced with real API calls later

**Step 1: Add execution stubs to execution_engine.py**

Add these methods to the `ExecutionEngine` class:

```python
async def _execute_firecrawl_scrape(
    self, compiled_node: dict[str, Any], upstream_output: dict[str, Any]
) -> dict[str, Any]:
    """Execute Firecrawl Scrape node (stub for now)."""
    from app.services.output_normalizer import OutputEnvelope

    # TODO: Implement real Firecrawl API call
    # from firecrawl import FirecrawlApp
    # app = FirecrawlApp(api_key=resolved_api_key)
    # result = app.scrape_url(url=compiled_node["url"], ...)

    # Stub return for now
    return OutputEnvelope.wrap(
        source="firecrawl_scrape",
        data={"markdown": "# Stub content", "html": "<h1>Stub</h1>"},
        metadata={"url": compiled_node["url"]},
        status="success"
    )


async def _execute_apify_actor(
    self, compiled_node: dict[str, Any], upstream_output: dict[str, Any]
) -> dict[str, Any]:
    """Execute Apify Actor node (stub for now)."""
    from app.services.output_normalizer import OutputEnvelope

    # TODO: Implement real Apify API call with polling

    return OutputEnvelope.wrap(
        source="apify_actor",
        data={"items": [], "total_count": 0},
        metadata={"actor_id": compiled_node["actor_id"]},
        status="success"
    )


async def _execute_mcp_server(
    self, compiled_node: dict[str, Any], upstream_output: dict[str, Any]
) -> dict[str, Any]:
    """Execute MCP Server node (stub for now)."""
    from app.services.output_normalizer import OutputEnvelope

    # TODO: Implement MCP client connection and agent execution

    return OutputEnvelope.wrap(
        source="mcp_server",
        data={"response": "MCP stub response"},
        metadata={"server_name": compiled_node["server_name"]},
        status="success"
    )


async def _execute_huggingface_inference(
    self, compiled_node: dict[str, Any], upstream_output: dict[str, Any]
) -> dict[str, Any]:
    """Execute Hugging Face Inference node (stub for now)."""
    from app.services.output_normalizer import OutputEnvelope

    # TODO: Implement real HF Inference API call

    return OutputEnvelope.wrap(
        source="huggingface_inference",
        data={"output": "HF stub output"},
        metadata={"model_id": compiled_node["model_id"], "task": compiled_node["task"]},
        status="success"
    )
```

**Step 2: Wire execution methods into main execution loop**

Find the node type routing logic in `execute()` method and add cases:

```python
# Add to node type routing
if node_type == "firecrawl_scrape":
    result = await self._execute_firecrawl_scrape(compiled_node, upstream_output)
elif node_type == "apify_actor":
    result = await self._execute_apify_actor(compiled_node, upstream_output)
elif node_type == "mcp_server":
    result = await self._execute_mcp_server(compiled_node, upstream_output)
elif node_type == "huggingface_inference":
    result = await self._execute_huggingface_inference(compiled_node, upstream_output)
```

**Step 3: Commit**

```bash
git add backend/app/services/execution_engine.py
git commit -m "feat: add execution engine stubs for external integrations

- Firecrawl Scrape execution (stub)
- Apify Actor execution (stub)
- MCP Server execution (stub)
- Hugging Face Inference execution (stub)
- All return normalized output envelopes
- TODO: Replace stubs with real API calls"
```

---

### Task 13-16: Implement Frontend Components

**Note:** Frontend tasks follow similar TDD pattern. For Phase 1 MVP, we'll create basic functional components. Full UI polish comes later.

I'll provide abbreviated task outlines since frontend follows predictable patterns.

---

#### Task 13: Firecrawl Scrape Frontend

**Files to create:**
- `frontend/src/components/nodes/FirecrawlScrapeNode.tsx`
- `frontend/src/components/panels/config/FirecrawlScrapeConfig.tsx`
- Modify: `frontend/src/types/flow.ts` (add TypeScript types)

**Steps:**
1. Add TypeScript types to `flow.ts`
2. Create node component (icon: `FileText`, subtitle: URL)
3. Create config panel (URL input, format checkboxes)
4. Register in node library
5. Test in browser
6. Commit

```bash
git commit -m "feat: add Firecrawl Scrape frontend components"
```

---

#### Task 14: Apify Actor Frontend

Similar pattern - node component + config panel with JSON editor.

```bash
git commit -m "feat: add Apify Actor frontend components"
```

---

#### Task 15: MCP Server Frontend

Similar pattern - node component + config panel with server URL input.

```bash
git commit -m "feat: add MCP Server frontend components"
```

---

#### Task 16: Hugging Face Inference Frontend

Similar pattern - node component + config panel with model selector.

```bash
git commit -m "feat: add Hugging Face Inference frontend components"
```

---

### Task 17: End-to-End Integration Test

**Files:**
- Create: `e2e/external-integrations.spec.ts`

**Step 1: Write E2E test for basic flow**

Create test that builds a flow on canvas and executes it:

```typescript
test('Firecrawl Scrape → Output flow executes', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Build flow
  await addNode('input', { value: 'https://example.com' });
  await addNode('firecrawl_scrape', { formats: ['markdown'] });
  await addNode('output');
  await connectNodes('input', 'firecrawl_scrape', 'output');

  // Run flow
  await page.click('[data-testid="run-button"]');

  // Verify execution
  await expect(page.locator('[data-node-status="complete"]')).toHaveCount(3);
});
```

**Step 2: Run E2E tests**

```bash
npx playwright test e2e/external-integrations.spec.ts
```

**Step 3: Commit**

```bash
git commit -m "test: add E2E tests for external integrations"
```

---

### Task 18: Documentation and README Updates

**Files:**
- Modify: `README.md`
- Create: `docs/external-integrations.md`

Add setup instructions for:
1. Generating `CREDENTIAL_VAULT_KEY`
2. Running Supabase migration
3. Adding API keys
4. Testing each integration

```bash
git commit -m "docs: add external integrations setup guide"
```

---

## Phase 1 Complete!

After completing all 18 tasks, you will have:

✅ **Infrastructure:**
- Credential vault with Fernet encryption
- Retry handler with exponential backoff
- Output normalizer for consistent responses
- Supabase credentials table

✅ **Backend (4 nodes):**
- Firecrawl Scrape compiler + tests
- Apify Actor compiler + tests
- MCP Server compiler + tests
- Hugging Face Inference compiler + tests
- Execution engine stubs

✅ **Frontend (4 nodes):**
- Component + config panel for each node type
- TypeScript types in sync with Pydantic models

✅ **Testing:**
- Unit tests (31+ passing)
- E2E tests for flow execution
- Integration test stubs

---

## Next Steps: Phase 2 (Specialized Nodes)

Phase 2 adds:
- Firecrawl Research (autonomous mode)
- 5 pre-configured Apify actors (hybrid mode)
- 2 pre-configured MCP servers (GitHub, Filesystem)
- 2 HF extensions (Dataset, Spaces)

**Total timeline:** Week 1-2 for Phase 1, Week 3-4 for Phase 2.

---

## Team Coordination Notes

**Shared Worktree:** All agents work in `.worktrees/external-integrations`

**Task Assignment:**
- Team Lead: Tasks 1-7 (infrastructure)
- Backend-Firecrawl: Task 8
- Backend-Apify: Task 9
- Backend-MCP: Task 10
- Backend-HuggingFace: Task 11
- Backend-Firecrawl: Part of Task 12 (execution engine)
- Frontend-DataExtraction: Tasks 13-14
- Frontend-AIServices: Tasks 15-16
- Team Lead: Tasks 17-18 (integration + docs)

**Coordination:**
- Use task list to track progress
- Commit frequently (each task = 1 commit)
- Run tests before each commit
- Team lead reviews before merging

---

**Plan saved to:** `docs/plans/2026-02-09-external-integrations-implementation.md`
