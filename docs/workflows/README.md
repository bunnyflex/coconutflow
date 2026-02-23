# CoconutFlow Workflow Templates

Templates are now seeded via `backend/scripts/seed_templates.py`. Run `cd backend && python3 scripts/seed_templates.py` to populate the database.

The seed script inserts 5 featured templates:

1. **Web Research Pipeline** — Input -> Web Search -> LLM Agent -> Output
2. **Document Q&A** — Input -> Knowledge Base -> LLM Agent -> Output
3. **Content Writer** — Input -> LLM Agent (outline) -> LLM Agent (write) -> Output
4. **Competitor Analysis** — Input -> Firecrawl Scrape -> LLM Agent -> Output
5. **Smart Router** — Input -> Conditional -> Agent-A / Agent-B -> Output

Templates appear on the **Templates** page (`/templates`) under the Featured tab. Users click "Use Template" to clone a template as their own editable flow.
