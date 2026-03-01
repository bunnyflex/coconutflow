"""
Templates API — endpoints for browsing and using public/featured flows as templates.

Returns raw JSON rows (bypasses Pydantic validation) so templates stored with
frontend-style flat configs are served as-is to the frontend.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/templates", tags=["templates"])


def _template_from_row(row: dict[str, Any]) -> dict[str, Any]:
    """Convert Supabase row to a template dict (raw, no Pydantic)."""
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row.get("description", ""),
        "nodes": row.get("nodes", []),
        "edges": row.get("edges", []),
        "metadata": {
            **row.get("metadata", {}),
            "created_at": row.get("created_at", ""),
            "updated_at": row.get("updated_at", ""),
        },
        "is_featured": row.get("is_featured", False),
        "is_public": row.get("is_public", False),
        "category": row.get("category"),
        "user_id": row.get("user_id"),
    }


@router.get("/featured")
async def list_featured_templates() -> JSONResponse:
    """List all featured templates (is_featured=True)."""
    supabase = get_supabase_client()
    response = (
        supabase.table("flows")
        .select("*")
        .eq("is_featured", True)
        .order("name")
        .execute()
    )
    return JSONResponse([_template_from_row(row) for row in response.data])


@router.get("/community")
async def list_community_templates() -> JSONResponse:
    """List community-published flows (is_public=True, is_featured=False)."""
    supabase = get_supabase_client()
    response = (
        supabase.table("flows")
        .select("*")
        .eq("is_public", True)
        .eq("is_featured", False)
        .order("created_at", desc=True)
        .execute()
    )
    return JSONResponse([_template_from_row(row) for row in response.data])


@router.post("/{template_id}/use")
async def use_template(template_id: str) -> JSONResponse:
    """Clone a template as a new user flow (resets is_featured/is_public flags)."""
    supabase = get_supabase_client()

    # Fetch the template
    result = supabase.table("flows").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    template = result.data[0]
    now = datetime.now(timezone.utc).isoformat()

    new_flow = {
        "id": str(uuid.uuid4()),
        "name": f"{template['name']} (copy)",
        "description": template.get("description", ""),
        "nodes": template.get("nodes", []),
        "edges": template.get("edges", []),
        "metadata": {
            **template.get("metadata", {}),
            "created_at": now,
            "updated_at": now,
        },
        "is_featured": False,
        "is_public": False,
        "category": template.get("category"),
    }

    insert_result = supabase.table("flows").insert(new_flow).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to create flow from template")

    return JSONResponse(_template_from_row(insert_result.data[0]))
