# Input Node

The Input node is the entry point for your flow. It receives data from the user and passes it downstream to connected nodes.

## Configuration

| Field | Description |
|-------|-------------|
| Label | A display name shown on the node and in execution logs |
| Default Value | Optional pre-filled value; used when no runtime input is provided |

## Behaviour

- During **Chat panel** execution, the Input node receives the text the user typed into the chat box
- During **Run button** execution (no chat), the Input node uses its configured Default Value
- The raw string value is passed as context to all directly connected downstream nodes

## Multiple Input Nodes

You can have more than one Input node in a flow. Each will receive the same user input text. This is useful for flows where you want to fan out to multiple parallel branches from a single user message.

## Output Format

The Input node outputs a plain string. Downstream nodes that accept context (LLM Agent, Knowledge Base, Conditional) receive this string merged into their context window.

## Tips

- Give Input nodes descriptive labels (`User Question`, `Search Query`) to make execution logs easier to read
- If your flow has no Input node, the LLM Agent will run with no user context — only its system prompt
