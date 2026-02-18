# Python Export

CoconutFlow can export any flow as a standalone Python script powered by the Agno framework. This lets you run your workflow outside the CoconutFlow UI — in CI pipelines, scheduled jobs, or your own applications.

## Exporting a Flow

1. Open your flow on the canvas
2. Click the **Export** button in the toolbar (download icon)
3. Choose **Export as Python**
4. The script downloads as `flow.py`

## Running the Exported Script

### 1. Install dependencies

```bash
pip install agno openai anthropic duckduckgo-search
```

### 2. Set environment variables

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or use python-dotenv:

```bash
pip install python-dotenv
```

```python
from dotenv import load_dotenv
load_dotenv()
```

### 3. Run the script

```bash
python flow.py
```

## Script Structure

The exported script contains:

- **Imports** — Agno framework and provider SDK imports
- **Agent definitions** — Each LLM Agent node becomes an `Agent` instance
- **Tool setup** — Web Search, Knowledge Base, and external integrations
- **Execution function** — `run_flow(input_text)` that executes the pipeline
- **Main block** — `if __name__ == "__main__"` entry point with a sample input

## Customisation

The exported script is plain Python — you can modify it freely:

- Change the input source (read from a file, API, database)
- Add logging or error handling
- Wrap the `run_flow()` function in a Flask/FastAPI endpoint
- Schedule it with cron or a job queue

## Limitations

- Conditional branching in exported scripts uses static evaluation — LLM-evaluated conditions are preserved
- Knowledge Base nodes require Supabase credentials in the environment
