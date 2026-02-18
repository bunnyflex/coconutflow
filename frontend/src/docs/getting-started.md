# What is CoconutFlow?

CoconutFlow is a no-code visual builder for creating AI agent workflows. You connect nodes on a canvas to form a directed graph — each node represents a step in your pipeline, such as receiving user input, calling an LLM, searching the web, or querying a knowledge base.

## The Canvas

The canvas is the main workspace. You can:

- **Add nodes** by clicking the "+" button in the left panel and dragging node types onto the canvas
- **Connect nodes** by dragging from an output handle (right side) to an input handle (left side) of another node
- **Configure nodes** by clicking on any node to open the configuration panel on the right
- **Run flows** by opening the Chat panel (bottom-right) and sending a message, or clicking the Run button

## Execution Model

When you run a flow, the backend compiles your graph into a topologically sorted execution plan. Nodes run in order, and each node receives the output of all upstream nodes as context. Results stream back in real-time over a WebSocket connection.

## Saving Flows

Flows are saved automatically as you make changes. Use the Flow Manager (toolbar) to give your flow a name, open saved flows, or create a copy.

## Next Steps

- Follow the [Your First Flow](first-flow) guide to build a working pipeline in under 5 minutes
- Browse the [Node Reference](nodes/input) to understand what each node type does
