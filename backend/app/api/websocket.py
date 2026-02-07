"""
WebSocket router for real-time flow execution.
Endpoint: /ws/execution
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.compiler.flow_compiler import FlowCompiler
from app.models.flow import FlowDefinition
from app.services.execution_engine import ExecutionEngine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_json(self, websocket: WebSocket, data: dict[str, Any]) -> None:
        await websocket.send_json(data)


manager = ConnectionManager()
compiler = FlowCompiler()
engine = ExecutionEngine()


@router.websocket("/ws/execution")
async def execution_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for streaming flow execution updates.

    Client sends:
      {"action": "execute", "flow": {<FlowDefinition JSON>}, "user_input": "..."}
    Server streams back:
      {"type": "node_start", "node_id": "...", ...}
      {"type": "node_output", "node_id": "...", "data": "..."}
      {"type": "node_complete", "node_id": "...", ...}
      {"type": "flow_complete", "flow_id": "...", "data": "..."}
      {"type": "error", "node_id": "...", "message": "..."}
    """
    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_json(websocket, {"type": "error", "message": "Invalid JSON"})
                continue

            action = message.get("action")

            if action == "execute":
                await _handle_execute(websocket, message)
            elif action == "ping":
                await manager.send_json(websocket, {"type": "pong"})
            else:
                await manager.send_json(websocket, {"type": "error", "message": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def _handle_execute(websocket: WebSocket, message: dict[str, Any]) -> None:
    """Compile and execute a flow, streaming results to the WebSocket."""
    flow_json = message.get("flow")
    user_input = message.get("user_input", "")

    if not flow_json:
        await manager.send_json(websocket, {"type": "error", "message": "Missing 'flow' payload"})
        return

    try:
        flow = FlowDefinition(**flow_json)
    except Exception as e:
        await manager.send_json(websocket, {"type": "error", "message": f"Invalid flow: {e}"})
        return

    try:
        execution_graph = compiler.compile(flow)
    except ValueError as e:
        await manager.send_json(websocket, {"type": "error", "message": f"Compilation failed: {e}"})
        return

    async for event in engine.execute(execution_graph, user_input=user_input):
        try:
            await manager.send_json(websocket, event.to_dict())
        except Exception:
            logger.warning("Failed to send event to client, connection may be closed")
            return
