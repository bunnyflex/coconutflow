"""
Export API endpoints.

Converts workflows to various formats (Python, JavaScript, etc.).
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.services.supabase_client import get_supabase_client
from app.services.python_exporter import PythonExporter
from app.models.flow import FlowDefinition

router = APIRouter(prefix="/api/flows", tags=["export"])


@router.get("/{flow_id}/export/python", response_class=PlainTextResponse)
async def export_python(flow_id: str):
    """
    Export workflow as Python script.

    Args:
        flow_id: Flow ID to export

    Returns:
        Python code as plain text

    Raises:
        404: Flow not found
        500: Export generation failed
    """
    # Fetch flow from database
    supabase = get_supabase_client()
    result = supabase.table("flows").select("*").eq("id", flow_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Flow not found")

    flow_data = result.data[0]

    # Parse as FlowDefinition
    try:
        flow = FlowDefinition(**flow_data)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse flow definition: {str(e)}"
        )

    # Generate Python code
    try:
        exporter = PythonExporter()
        python_code = exporter.generate(flow)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate Python code: {str(e)}"
        )

    return python_code
