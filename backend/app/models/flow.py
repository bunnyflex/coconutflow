"""
Pydantic models for the AgnoFlow Flow JSON Schema.
Matches PRD Section 10 Flow JSON specification.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class NodeType(str, Enum):
    """All supported node types in the flow canvas."""
    AGENT = "agent"
    TEAM = "team"
    TOOL = "tool"
    KNOWLEDGE_BASE = "knowledge_base"
    PROMPT = "prompt"
    INPUT = "input"
    OUTPUT = "output"
    CONDITIONAL = "conditional"
    LOOP = "loop"
    WEBHOOK = "webhook"
    SCHEDULE = "schedule"


class TeamMode(str, Enum):
    """Team coordination modes per Agno SDK."""
    COORDINATE = "coordinate"
    ROUTE = "route"
    COLLABORATE = "collaborate"


class AgentProvider(str, Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    GROQ = "groq"


# ---------------------------------------------------------------------------
# Position
# ---------------------------------------------------------------------------

class NodePosition(BaseModel):
    """Canvas position of a node (React Flow coordinates)."""
    x: float = 0.0
    y: float = 0.0


# ---------------------------------------------------------------------------
# Node Configs  (union-style via Optional fields)
# ---------------------------------------------------------------------------

class AgentConfig(BaseModel):
    """Configuration specific to Agent nodes."""
    name: str = "Unnamed Agent"
    provider: AgentProvider = AgentProvider.OPENAI
    model: str = "gpt-4o"
    system_prompt: str = ""
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = None
    tools: list[str] = Field(default_factory=list)
    knowledge_bases: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    show_tool_calls: bool = True
    markdown: bool = True


class TeamConfig(BaseModel):
    """Configuration specific to Team nodes."""
    name: str = "Unnamed Team"
    mode: TeamMode = TeamMode.COORDINATE
    members: list[str] = Field(default_factory=list)
    instructions: list[str] = Field(default_factory=list)
    success_criteria: str = ""
    enable_agentic_context: bool = True
    share_member_interactions: bool = True


class ToolConfig(BaseModel):
    """Configuration specific to Tool nodes."""
    tool_type: str = ""  # e.g. "DuckDuckGoSearch", "PythonFunction", etc.
    parameters: dict[str, Any] = Field(default_factory=dict)


class KnowledgeBaseConfig(BaseModel):
    """Configuration specific to Knowledge Base nodes."""
    kb_type: str = "pdf"  # pdf, url, text, etc.
    vector_db: str = "pgvector"
    sources: list[str] = Field(default_factory=list)
    chunk_size: int = 1000
    chunk_overlap: int = 200


class PromptConfig(BaseModel):
    """Configuration specific to Prompt / template nodes."""
    template: str = ""
    variables: dict[str, str] = Field(default_factory=dict)


class ConditionalConfig(BaseModel):
    """Configuration specific to Conditional (branching) nodes."""
    condition_expression: str = ""
    true_label: str = "Yes"
    false_label: str = "No"


class LoopConfig(BaseModel):
    """Configuration specific to Loop nodes."""
    max_iterations: int = 10
    break_condition: str = ""


class WebhookConfig(BaseModel):
    """Configuration specific to Webhook trigger nodes."""
    path: str = "/webhook"
    method: str = "POST"


class ScheduleConfig(BaseModel):
    """Configuration specific to Schedule trigger nodes."""
    cron_expression: str = "0 * * * *"
    timezone: str = "UTC"


class InputOutputConfig(BaseModel):
    """Configuration for Input / Output nodes."""
    label: str = ""
    data_type: str = "text"  # text, json, file


# ---------------------------------------------------------------------------
# Unified NodeConfig
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Flow Graph primitives
# ---------------------------------------------------------------------------

class FlowNode(BaseModel):
    """A single node in the flow graph."""
    id: str
    type: NodeType
    position: NodePosition = Field(default_factory=NodePosition)
    config: NodeConfig = Field(default_factory=NodeConfig)
    label: str = ""


class FlowEdge(BaseModel):
    """A directed edge connecting two nodes."""
    id: str
    source: str  # source node id
    source_handle: Optional[str] = None
    target: str  # target node id
    target_handle: Optional[str] = None
    label: Optional[str] = None


# ---------------------------------------------------------------------------
# Metadata & top-level definition
# ---------------------------------------------------------------------------

class FlowMetadata(BaseModel):
    """Metadata attached to a flow definition."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
    author: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class FlowDefinition(BaseModel):
    """
    Top-level Flow JSON schema.
    This is what gets saved to / loaded from Supabase and exchanged
    between the React frontend and the FastAPI backend.
    """
    id: str
    name: str = "Untitled Flow"
    description: str = ""
    nodes: list[FlowNode] = Field(default_factory=list)
    edges: list[FlowEdge] = Field(default_factory=list)
    metadata: FlowMetadata = Field(default_factory=FlowMetadata)
