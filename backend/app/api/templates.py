"""
Templates API — endpoints for browsing and using public/featured flows as templates.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from app.models.flow import FlowDefinition
from app.services.supabase_client import get_supabase_client
from app.api.flows import _flow_from_db_row

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/featured", response_model=list[FlowDefinition])
async def list_featured_templates() -> list[FlowDefinition]:
    """List all featured templates (is_featured=True)."""
    supabase = get_supabase_client()
    response = (
        supabase.table("flows")
        .select("*")
        .eq("is_featured", True)
        .order("name")
        .execute()
    )
    return [_flow_from_db_row(row) for row in response.data]


@router.get("/community", response_model=list[FlowDefinition])
async def list_community_templates() -> list[FlowDefinition]:
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
    return [_flow_from_db_row(row) for row in response.data]


@router.post("/{template_id}/use", response_model=FlowDefinition)
async def use_template(template_id: str) -> FlowDefinition:
    """Clone a template as a new user flow (resets is_featured/is_public flags)."""
    supabase = get_supabase_client()

    # Fetch the template
    result = supabase.table("flows").select("*").eq("id", template_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    template = _flow_from_db_row(result.data[0])

    now = datetime.utcnow().isoformat()
    new_flow = {
        "id": str(uuid.uuid4()),
        "name": f"{template.name} (copy)",
        "description": template.description,
        "nodes": [n.model_dump() for n in template.nodes],
        "edges": [e.model_dump() for e in template.edges],
        "metadata": {
            **template.metadata.model_dump(),
            "created_at": now,
            "updated_at": now,
        },
        "is_featured": False,
        "is_public": False,
        "category": template.category,
    }

    insert_result = supabase.table("flows").insert(new_flow).execute()
    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to create flow from template")

    return _flow_from_db_row(insert_result.data[0])
