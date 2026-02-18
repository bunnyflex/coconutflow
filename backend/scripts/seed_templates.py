"""
Seed script: insert 5 featured templates into the flows table.

PREREQUISITES:
  1. Run migration 003_add_template_columns.sql in Supabase SQL editor first
  2. Have a valid .env file in backend/ with SUPABASE_URL and SUPABASE_ANON_KEY

Usage:
  cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/backend
  /Library/Developer/CommandLineTools/usr/bin/python3 scripts/seed_templates.py
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

NOW = datetime.utcnow().isoformat()


TEMPLATES = [
    {
        "id": str(uuid.uuid4()),
        "name": "Web Research Pipeline",
        "description": "Search the web for a topic and summarise the findings with an LLM agent.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Research Topic"}}},
            {"id": "n2", "type": "web_search", "position": {"x": 350, "y": 200}, "config": {"web_search": {"max_results": 5}}},
            {"id": "n3", "type": "agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "Summarise the search results into a concise report.", "temperature": 0.3}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Research Summary"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["research", "web"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Document Q&A",
        "description": "Upload documents to a knowledge base and ask questions about their content.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Your Question"}}},
            {"id": "n2", "type": "knowledge_base", "position": {"x": 350, "y": 200}, "config": {"knowledge_base": {"kb_type": "pdf", "vector_db": "pgvector", "sources": []}}},
            {"id": "n3", "type": "agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "Answer the question using only the provided context.", "temperature": 0.1}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Answer"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["rag", "documents"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Content Writer",
        "description": "Generate a blog post or article on any topic using a two-stage LLM pipeline.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Topic & Tone"}}},
            {"id": "n2", "type": "agent", "position": {"x": 350, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Create a detailed outline for an article on this topic.", "temperature": 0.7}}},
            {"id": "n3", "type": "agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Write a full article based on this outline. Be engaging and informative.", "temperature": 0.8}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "Article"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["content", "writing"]},
        "is_featured": True,
        "is_public": True,
        "category": "content",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Competitor Analysis",
        "description": "Scrape a competitor website with Firecrawl and generate a SWOT analysis.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 200}, "config": {"input_output": {"label": "Competitor URL"}}},
            {"id": "n2", "type": "firecrawl_scrape", "position": {"x": 350, "y": 200}, "config": {"firecrawl_scrape": {"url": "", "formats": ["markdown"]}}},
            {"id": "n3", "type": "agent", "position": {"x": 600, "y": 200}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "Analyse the scraped content and produce a SWOT analysis with actionable insights.", "temperature": 0.3}}},
            {"id": "n4", "type": "output", "position": {"x": 850, "y": 200}, "config": {"input_output": {"label": "SWOT Analysis"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": None, "target_handle": None},
            {"id": "e3", "source": "n3", "target": "n4", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["competitive", "research", "firecrawl"]},
        "is_featured": True,
        "is_public": True,
        "category": "research",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Smart Router",
        "description": "Route user input to different agents based on topic — a conditional branching example.",
        "nodes": [
            {"id": "n1", "type": "input", "position": {"x": 100, "y": 250}, "config": {"input_output": {"label": "User Query"}}},
            {"id": "n2", "type": "conditional", "position": {"x": 350, "y": 250}, "config": {"conditional": {"condition_expression": "Is the input a technical programming question?"}}},
            {"id": "n3", "type": "agent", "position": {"x": 600, "y": 100}, "config": {"agent": {"provider": "openai", "model": "gpt-4o", "instructions": "You are a senior software engineer. Answer technical questions precisely.", "temperature": 0.2}}},
            {"id": "n4", "type": "agent", "position": {"x": 600, "y": 400}, "config": {"agent": {"provider": "openai", "model": "gpt-4o-mini", "instructions": "You are a helpful general assistant. Answer conversationally.", "temperature": 0.7}}},
            {"id": "n5", "type": "output", "position": {"x": 850, "y": 250}, "config": {"input_output": {"label": "Response"}}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "source_handle": None, "target_handle": None},
            {"id": "e2", "source": "n2", "target": "n3", "source_handle": "true", "target_handle": None},
            {"id": "e3", "source": "n2", "target": "n4", "source_handle": "false", "target_handle": None},
            {"id": "e4", "source": "n3", "target": "n5", "source_handle": None, "target_handle": None},
            {"id": "e5", "source": "n4", "target": "n5", "source_handle": None, "target_handle": None},
        ],
        "metadata": {"created_at": NOW, "updated_at": NOW, "version": "1.0.0", "author": "CoconutFlow", "tags": ["conditional", "routing"]},
        "is_featured": True,
        "is_public": True,
        "category": "automation",
    },
]


def seed() -> None:
    supabase = get_supabase_client()
    for template in TEMPLATES:
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
        result = supabase.table("flows").insert(template).execute()
        if result.data:
            print(f"  OK: {template['name']}")
        else:
            print(f"  FAIL: {template['name']}")


if __name__ == "__main__":
    print("Seeding featured templates...")
    seed()
    print("Done.")
