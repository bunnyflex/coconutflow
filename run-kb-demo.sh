#!/bin/bash

# Knowledge Base Multi-Source RAG Demo
# Runs Playwright E2E test with VISIBLE BROWSER

echo ""
echo "🎬 ========================================="
echo "   KNOWLEDGE BASE MULTI-SOURCE RAG DEMO"
echo "   ========================================="
echo ""
echo "This will:"
echo "  1. Check if backend & frontend servers are running"
echo "  2. Launch Playwright with VISIBLE BROWSER"
echo "  3. Build a RAG flow with 3 sources:"
echo "     - File (AI healthcare document)"
echo "     - Website (Python docs)"
echo "     - YouTube (tutorial video)"
echo "  4. Execute the flow and show RAG answer"
echo ""
echo "⚠️  Requirements:"
echo "  - Backend server on port 8000"
echo "  - Frontend server on port 5173"
echo "  - DATABASE_URL set (Supabase pgvector)"
echo "  - OPENAI_API_KEY set"
echo ""

# Check backend
if ! curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "❌ Backend not running on port 8000"
    echo ""
    echo "Start it with:"
    echo "  cd backend && uvicorn app.main:app --reload --port 8000"
    echo ""
    exit 1
fi
echo "✅ Backend running on port 8000"

# Check frontend
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "❌ Frontend not running on port 5173"
    echo ""
    echo "Start it with:"
    echo "  cd frontend && npm run dev"
    echo ""
    exit 1
fi
echo "✅ Frontend running on port 5173"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not set - RAG will fail!"
    echo "Set it with:"
    echo "  export DATABASE_URL='your-supabase-url'"
    echo ""
fi

# Check OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY not set - RAG will fail!"
    echo "Set it with:"
    echo "  export OPENAI_API_KEY='sk-...'"
    echo ""
fi

echo ""
echo "🚀 Launching Playwright with VISIBLE BROWSER..."
echo ""

# Run Playwright (headless: false is now default in config)
PATH="/opt/homebrew/bin:$PATH" npx playwright test e2e/kb-multi-source-demo.spec.ts

echo ""
echo "✅ Demo complete!"
echo ""
