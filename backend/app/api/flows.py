"""
API router for flow CRUD operations.
Endpoints: /api/flows
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.models.flow import FlowDefinition
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/flows", tags=["flows"])


def _flow_from_db_row(row: dict[str, Any]) -> FlowDefinition:
    """Convert Supabase row to FlowDefinition"""
    return FlowDefinition(
        id=row["id"],
        name=row["name"],
        description=row.get("description", ""),
        nodes=row["nodes"],
        edges=row["edges"],
        metadata={
            **row.get("metadata", {}),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
    )


@router.get("/", response_model=list[FlowDefinition])
async def list_flows() -> list[FlowDefinition]:
    """List all saved flows."""
    supabase = get_supabase_client()

    response = supabase.table("flows").select("*").order("created_at", desc=True).execute()

    return [_flow_from_db_row(row) for row in response.data]


@router.get("/{flow_id}", response_model=FlowDefinition)
async def get_flow(flow_id: str) -> FlowDefinition:
    """Get a single flow by ID."""
    supabase = get_supabase_client()

    response = supabase.table("flows").select("*").eq("id", flow_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    return _flow_from_db_row(response.data[0])


@router.post("/", response_model=FlowDefinition, status_code=201)
async def create_flow(flow: FlowDefinition) -> FlowDefinition:
    """Create a new flow."""
    supabase = get_supabase_client()

    # Check if flow already exists
    existing = supabase.table("flows").select("id").eq("id", flow.id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Flow with this ID already exists")

    # Insert new flow
    row = {
        "id": flow.id,
        "name": flow.name,
        "description": flow.description or "",
        "nodes": [node.model_dump(mode='json') for node in flow.nodes],
        "edges": [edge.model_dump(mode='json') for edge in flow.edges],
        "metadata": flow.metadata.model_dump(mode='json') if hasattr(flow.metadata, 'model_dump') else flow.metadata,
    }

    response = supabase.table("flows").insert(row).execute()

    return _flow_from_db_row(response.data[0])


@router.put("/{flow_id}", response_model=FlowDefinition)
async def update_flow(flow_id: str, flow: FlowDefinition) -> FlowDefinition:
    """Update an existing flow."""
    supabase = get_supabase_client()

    # Check if flow exists
    existing = supabase.table("flows").select("id").eq("id", flow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    # Update flow
    flow.id = flow_id  # Ensure ID matches URL
    row = {
        "name": flow.name,
        "description": flow.description or "",
        "nodes": [node.model_dump(mode='json') for node in flow.nodes],
        "edges": [edge.model_dump(mode='json') for edge in flow.edges],
        "metadata": flow.metadata.model_dump(mode='json') if hasattr(flow.metadata, 'model_dump') else flow.metadata,
    }

    response = supabase.table("flows").update(row).eq("id", flow_id).execute()

    return _flow_from_db_row(response.data[0])


@router.delete("/{flow_id}", status_code=204)
async def delete_flow(flow_id: str) -> None:
    """Delete a flow."""
    supabase = get_supabase_client()

    # Check if flow exists
    existing = supabase.table("flows").select("id").eq("id", flow_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Flow not found")

    # Delete flow
    supabase.table("flows").delete().eq("id", flow_id).execute()


@router.post("/{flow_id}/compile")
async def compile_flow(flow_id: str) -> dict[str, Any]:
    """Compile a flow into an executable representation."""
    flow = await get_flow(flow_id)

    from app.compiler.flow_compiler import FlowCompiler

    compiler = FlowCompiler()
    try:
        result = compiler.compile(flow)
        return {"status": "compiled", "execution_graph": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
