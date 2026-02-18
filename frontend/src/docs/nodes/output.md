# Output Node

The Output node marks the end of a flow branch. It collects the output of all directly upstream nodes and presents it as the final result.

## Configuration

| Field | Description |
|-------|-------------|
| Label | Display name shown in the execution results panel |

## Behaviour

- Aggregates all upstream node outputs into a single result
- When the Chat panel is open, the output appears as the assistant's reply
- Multiple Output nodes are allowed — each represents a separate final result

## Multiple Outputs

You can have more than one Output node in a flow. This is typical for Conditional flows where you want different outputs for the true and false branches:

```
Conditional -> LLM Agent A -> Output (True Path)
            -> LLM Agent B -> Output (False Path)
```

Only the Output node on the active branch produces a result; the other is marked as skipped.

## Execution Results

Each Output node's result is shown in the right-side execution panel after a flow completes. Results are labelled using the Output node's configured label.

## Tips

- Label your Output nodes descriptively (`Final Answer`, `Error Response`, `Summary`) to make results easier to identify
- If no Output node is connected to the last node in a chain, the Chat panel still displays results — it falls back to the output of the last completed node
