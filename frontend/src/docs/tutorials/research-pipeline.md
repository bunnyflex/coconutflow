# Tutorial: Research Pipeline

This tutorial builds a pipeline that takes a research question, searches the web, and returns a synthesised answer.

**Flow pattern:** Input -> Web Search -> LLM Agent -> Output

## Prerequisites

- OpenAI API key configured in your backend `.env`
- CoconutFlow running locally (frontend on port 5173, backend on port 8000)

## Step 1: Build the flow

1. Open CoconutFlow and click **New Flow**
2. Add an **Input** node. Label it `Research Question`
3. Add a **Web Search** node. Set Max Results to `8`
4. Add an **LLM Agent** node with:
   - Provider: OpenAI
   - Model: `gpt-4o-mini`
   - System Prompt: `You are a research assistant. Using the provided web search results, write a clear, accurate, and well-structured answer to the user's question. Cite sources where possible.`
5. Add an **Output** node. Label it `Research Summary`

## Step 2: Connect the nodes

Connect in order: Input -> Web Search -> LLM Agent -> Output

## Step 3: Run it

Open the Chat panel and ask a question:

```
What are the latest developments in quantum computing?
```

## What to Expect

1. The Input node captures your question
2. Web Search queries DuckDuckGo and returns 8 results
3. The LLM Agent receives both your question and the search results as context
4. It synthesises a cited answer and sends it to the Output node
5. The answer appears in the Chat panel

## Enhancements

- Add a second LLM Agent before Web Search to reformulate the question into an optimised search query
- Add a Conditional node to route simple questions (no search needed) vs complex ones
