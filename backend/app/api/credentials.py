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
