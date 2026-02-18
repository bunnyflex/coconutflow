# Your First Flow

This guide walks you through building a simple Input → LLM Agent → Output pipeline.

## Step 1: Add an Input node

1. Click the "+" button in the left sidebar
2. Drag the **Input** node onto the canvas
3. Click the node to open its config panel
4. Set the label to `User Question`

## Step 2: Add an LLM Agent node

1. Drag an **LLM Agent** node onto the canvas to the right of your Input node
2. In the config panel, select your provider (e.g., OpenAI) and model (e.g., `gpt-4o-mini`)
3. Set a system prompt, for example: `You are a helpful assistant. Answer concisely.`
4. Make sure your API key is set — either in the Keys page or in the backend `.env` file

## Step 3: Add an Output node

1. Drag an **Output** node to the right of the Agent node
2. Set its label to `Answer`

## Step 4: Connect the nodes

1. Drag from the right handle of **Input** to the left handle of **LLM Agent**
2. Drag from the right handle of **LLM Agent** to the left handle of **Output**

## Step 5: Run the flow

1. Click the chat icon (bottom-right) to open the Chat panel
2. Type a question and press Enter
3. Watch the nodes light up as execution progresses
4. The answer appears in the chat panel when complete

## What Just Happened

Your input was passed as context to the LLM Agent, which called the OpenAI API and returned a response. The Output node collected and displayed the final result.
