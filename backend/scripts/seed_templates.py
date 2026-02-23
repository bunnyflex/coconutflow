"""
Seed script: insert 5 featured templates into the flows table.

PREREQUISITES:
  1. Run migration 003_add_template_columns.sql in Supabase SQL editor first
  2. Have a valid .env file in backend/ with SUPABASE_URL and SUPABASE_ANON_KEY

Usage (from repo root):
  cd backend
  python3 scripts/seed_templates.py

NOTE: Templates use the FRONTEND node type names and flat config shapes
(matching frontend/src/types/flow.ts DEFAULT_CONFIGS), NOT the backend
Pydantic nested config format. This is because templates are loaded
directly into the React Flow canvas via flowStore.loadFlow() which
expects frontend types. The flowTransform.ts layer converts to backend
format only at execution time.
"""
from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import uuid
from datetime import datetime
from app.services.supabase_client import get_supabase_client


def _now() -> str:
    return datetime.utcnow().isoformat()


def _make_templates() -> list:
    """Build template dicts. Called at seed time so each gets a distinct timestamp."""
    return [
        # ── 1. Web Research Pipeline ──────────────────────────────────────
        # Input -> Web Search -> LLM Agent -> Output
        {
            "id": str(uuid.uuid4()),
            "name": "Web Research Pipeline",
            "description": "Search the web for a topic and summarise the findings with an LLM agent.",
            "nodes": [
                {
                    "id": "n1", "type": "input",
                    "position": {"x": 100, "y": 200},
                    "config": {"input_type": "text", "placeholder": "Enter a research topic...", "value": ""},
                },
                {
                    "id": "n2", "type": "web_search",
                    "position": {"x": 350, "y": 200},
                    "config": {"query_template": "", "result_count": 5},
                },
                {
                    "id": "n3", "type": "llm_agent",
                    "position": {"x": 600, "y": 200},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o-mini",
                        "instructions": "Summarise the search results into a concise report.",
                        "temperature": 0.3, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n4", "type": "output",
                    "position": {"x": 850, "y": 200},
                    "config": {"display_format": "markdown", "copy_to_clipboard": True},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "source_handle": "output", "target_handle": "input"},
                {"id": "e2", "source": "n2", "target": "n3", "source_handle": "output", "target_handle": "input"},
                {"id": "e3", "source": "n3", "target": "n4", "source_handle": "output", "target_handle": "input"},
            ],
            "metadata": {"created_at": _now(), "updated_at": _now(), "version": "1.0.0", "author": "CoconutFlow", "tags": ["research", "web"]},
            "is_featured": True,
            "is_public": True,
            "category": "research",
        },

        # ── 2. Document Q&A ──────────────────────────────────────────────
        # Input -> Knowledge Base -> LLM Agent -> Output
        {
            "id": str(uuid.uuid4()),
            "name": "Document Q&A",
            "description": "Upload documents to a knowledge base and ask questions about their content.",
            "nodes": [
                {
                    "id": "n1", "type": "input",
                    "position": {"x": 100, "y": 200},
                    "config": {"input_type": "text", "placeholder": "Ask a question about your documents...", "value": ""},
                },
                {
                    "id": "n2", "type": "knowledge_base",
                    "position": {"x": 350, "y": 200},
                    "config": {"files": [], "sources": [], "chunk_size": 1000, "chunk_overlap": 200, "top_k": 5, "search_type": "hybrid"},
                },
                {
                    "id": "n3", "type": "llm_agent",
                    "position": {"x": 600, "y": 200},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o-mini",
                        "instructions": "Answer the question using only the provided context.",
                        "temperature": 0.1, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n4", "type": "output",
                    "position": {"x": 850, "y": 200},
                    "config": {"display_format": "markdown", "copy_to_clipboard": True},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "source_handle": "output", "target_handle": "input"},
                {"id": "e2", "source": "n2", "target": "n3", "source_handle": "output", "target_handle": "input"},
                {"id": "e3", "source": "n3", "target": "n4", "source_handle": "output", "target_handle": "input"},
            ],
            "metadata": {"created_at": _now(), "updated_at": _now(), "version": "1.0.0", "author": "CoconutFlow", "tags": ["rag", "documents"]},
            "is_featured": True,
            "is_public": True,
            "category": "research",
        },

        # ── 3. Content Writer ────────────────────────────────────────────
        # Input -> LLM Agent (outline) -> LLM Agent (write) -> Output
        {
            "id": str(uuid.uuid4()),
            "name": "Content Writer",
            "description": "Generate a blog post or article on any topic using a two-stage LLM pipeline.",
            "nodes": [
                {
                    "id": "n1", "type": "input",
                    "position": {"x": 100, "y": 200},
                    "config": {"input_type": "text", "placeholder": "Enter a topic and desired tone...", "value": ""},
                },
                {
                    "id": "n2", "type": "llm_agent",
                    "position": {"x": 350, "y": 200},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o",
                        "instructions": "Create a detailed outline for an article on this topic.",
                        "temperature": 0.7, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n3", "type": "llm_agent",
                    "position": {"x": 600, "y": 200},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o",
                        "instructions": "Write a full article based on this outline. Be engaging and informative.",
                        "temperature": 0.8, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n4", "type": "output",
                    "position": {"x": 850, "y": 200},
                    "config": {"display_format": "markdown", "copy_to_clipboard": True},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "source_handle": "output", "target_handle": "input"},
                {"id": "e2", "source": "n2", "target": "n3", "source_handle": "output", "target_handle": "input"},
                {"id": "e3", "source": "n3", "target": "n4", "source_handle": "output", "target_handle": "input"},
            ],
            "metadata": {"created_at": _now(), "updated_at": _now(), "version": "1.0.0", "author": "CoconutFlow", "tags": ["content", "writing"]},
            "is_featured": True,
            "is_public": True,
            "category": "content",
        },

        # ── 4. Competitor Analysis ───────────────────────────────────────
        # Input -> Firecrawl Scrape -> LLM Agent -> Output
        {
            "id": str(uuid.uuid4()),
            "name": "Competitor Analysis",
            "description": "Scrape a competitor website with Firecrawl and generate a SWOT analysis.",
            "nodes": [
                {
                    "id": "n1", "type": "input",
                    "position": {"x": 100, "y": 200},
                    "config": {"input_type": "url", "placeholder": "Enter competitor URL...", "value": ""},
                },
                {
                    "id": "n2", "type": "firecrawl_scrape",
                    "position": {"x": 350, "y": 200},
                    "config": {"url": "", "formats": ["markdown"], "include_metadata": True, "credential_id": None},
                },
                {
                    "id": "n3", "type": "llm_agent",
                    "position": {"x": 600, "y": 200},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o",
                        "instructions": "Analyse the scraped content and produce a SWOT analysis with actionable insights.",
                        "temperature": 0.3, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n4", "type": "output",
                    "position": {"x": 850, "y": 200},
                    "config": {"display_format": "markdown", "copy_to_clipboard": True},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "source_handle": "output", "target_handle": "input"},
                {"id": "e2", "source": "n2", "target": "n3", "source_handle": "output", "target_handle": "input"},
                {"id": "e3", "source": "n3", "target": "n4", "source_handle": "output", "target_handle": "input"},
            ],
            "metadata": {"created_at": _now(), "updated_at": _now(), "version": "1.0.0", "author": "CoconutFlow", "tags": ["competitive", "research", "firecrawl"]},
            "is_featured": True,
            "is_public": True,
            "category": "research",
        },

        # ── 5. Smart Router ──────────────────────────────────────────────
        # Input -> Conditional -> Agent-A (true) / Agent-B (false) -> Output
        {
            "id": str(uuid.uuid4()),
            "name": "Smart Router",
            "description": "Route user input to different agents based on topic \u2014 a conditional branching example.",
            "nodes": [
                {
                    "id": "n1", "type": "input",
                    "position": {"x": 100, "y": 250},
                    "config": {"input_type": "text", "placeholder": "Enter your question...", "value": ""},
                },
                {
                    "id": "n2", "type": "conditional",
                    "position": {"x": 350, "y": 250},
                    "config": {"condition": "Is the input a technical programming question?", "true_label": "Technical", "false_label": "General"},
                },
                {
                    "id": "n3", "type": "llm_agent",
                    "position": {"x": 600, "y": 100},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o",
                        "instructions": "You are a senior software engineer. Answer technical questions precisely.",
                        "temperature": 0.2, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n4", "type": "llm_agent",
                    "position": {"x": 600, "y": 400},
                    "config": {
                        "model_provider": "openai", "model_id": "gpt-4o-mini",
                        "instructions": "You are a helpful general assistant. Answer conversationally.",
                        "temperature": 0.7, "tools": [], "show_tool_calls": True, "markdown": True,
                    },
                },
                {
                    "id": "n5", "type": "output",
                    "position": {"x": 850, "y": 250},
                    "config": {"display_format": "markdown", "copy_to_clipboard": True},
                },
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "source_handle": "output", "target_handle": "input"},
                {"id": "e2", "source": "n2", "target": "n3", "source_handle": "true", "target_handle": "input"},
                {"id": "e3", "source": "n2", "target": "n4", "source_handle": "false", "target_handle": "input"},
                {"id": "e4", "source": "n3", "target": "n5", "source_handle": "output", "target_handle": "input"},
                {"id": "e5", "source": "n4", "target": "n5", "source_handle": "output", "target_handle": "input"},
            ],
            "metadata": {"created_at": _now(), "updated_at": _now(), "version": "1.0.0", "author": "CoconutFlow", "tags": ["conditional", "routing"]},
            "is_featured": True,
            "is_public": True,
            "category": "automation",
        },
    ]


def seed() -> None:
    supabase = get_supabase_client()
    templates = _make_templates()
    failed: list[str] = []
    for template in templates:
        # Idempotent: skip if a featured template with this name already exists
        existing = (
            supabase.table("flows")
            .select("id")
            .eq("name", template["name"])
            .eq("is_featured", True)
            .execute()
        )
        if existing.data:
            print(f"  SKIP (exists): {template['name']}")
            continue
        try:
            result = supabase.table("flows").insert(template).execute()
            if result.data:
                print(f"  OK: {template['name']}")
            else:
                print(f"  FAIL: {template['name']}")
                failed.append(template["name"])
        except Exception as exc:
            print(f"  ERROR: {template['name']} \u2014 {exc}")
            failed.append(template["name"])
    if failed:
        print(f"\n{len(failed)} template(s) failed to insert: {failed}")
        sys.exit(1)


if __name__ == "__main__":
    print("Seeding featured templates...")
    seed()
    print("Done.")
