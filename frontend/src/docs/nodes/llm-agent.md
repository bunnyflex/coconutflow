# LLM Agent Node

The LLM Agent node calls an AI language model to process input and produce text output. It is the core intelligence node in most flows.

## Configuration

| Field | Description |
|-------|-------------|
| Provider | AI provider: OpenAI, Anthropic, Google, Groq, or Ollama |
| Model | Model ID (e.g. `gpt-4o`, `claude-3-5-sonnet-20241022`, `gemini-2.0-flash`) |
| System Prompt | Instructions that define the agent's role and behaviour |
| Temperature | Sampling temperature (0 = deterministic, 1 = creative) |

## Supported Providers

- **OpenAI** — Requires `OPENAI_API_KEY` in backend `.env`
- **Anthropic** — Requires `ANTHROPIC_API_KEY`
- **Google** — Requires `GOOGLE_API_KEY` (Gemini models)
- **Groq** — Requires `GROQ_API_KEY` (fast Llama/Mixtral inference)
- **Ollama** — Runs locally; set `OLLAMA_HOST` if not on localhost

## Context Handling

All upstream node outputs are automatically injected into the agent's user message as context. You do not need to manually wire context — the execution engine handles this.

## Multi-Agent Chaining

You can connect one LLM Agent's output to another LLM Agent's input. The second agent receives the first agent's response as part of its context.

## Example System Prompts

```
You are a research assistant. Summarise the provided information concisely.
```

```
You are a code reviewer. Identify bugs and suggest improvements.
```
