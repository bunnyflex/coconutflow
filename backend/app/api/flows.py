"""
API router for flow CRUD operations.
Endpoints: /api/flows
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.models.flow import FlowDefinition

router = APIRouter(prefix="/api/flows", tags=["flows"])


# In-memory store for development; will be replaced with Supabase persistence
_flows: dict[str, FlowDefinition] = {}


@router.get("/", response_model=list[FlowDefinition])
async def list_flows() -> list[FlowDefinition]:
    """List all saved flows."""
    return list(_flows.values())


@router.get("/{flow_id}", response_model=FlowDefinition)
async def get_flow(flow_id: str) -> FlowDefinition:
    """Get a single flow by ID."""
    flow = _flows.get(flow_id)
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow


@router.post("/", response_model=FlowDefinition, status_code=201)
async def create_flow(flow: FlowDefinition) -> FlowDefinition:
    """Create a new flow."""
    if flow.id in _flows:
        raise HTTPException(status_code=409, detail="Flow with this ID already exists")
    _flows[flow.id] = flow
    return flow


@router.put("/{flow_id}", response_model=FlowDefinition)
async def update_flow(flow_id: str, flow: FlowDefinition) -> FlowDefinition:
    """Update an existing flow."""
    if flow_id not in _flows:
        raise HTTPException(status_code=404, detail="Flow not found")
    flow.id = flow_id
    _flows[flow_id] = flow
    return flow


@router.delete("/{flow_id}", status_code=204)
async def delete_flow(flow_id: str) -> None:
    """Delete a flow."""
    if flow_id not in _flows:
        raise HTTPException(status_code=404, detail="Flow not found")
    del _flows[flow_id]


@router.post("/{flow_id}/compile")
async def compile_flow(flow_id: str) -> dict[str, Any]:
    """Compile a flow into an executable representation."""
    flow = _flows.get(flow_id)
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    from app.compiler.flow_compiler import FlowCompiler

    compiler = FlowCompiler()
    try:
        result = compiler.compile(flow)
        return {"status": "compiled", "execution_graph": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
