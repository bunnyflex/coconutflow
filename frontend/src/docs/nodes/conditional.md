# Conditional Node

The Conditional node evaluates a condition using an LLM and routes execution down either the true or false path. It enables if/else branching in your flow.

## Configuration

| Field | Description |
|-------|-------------|
| Condition | A natural-language question the LLM answers with "true" or "false" |
| Provider / Model | The LLM used to evaluate the condition |

## How It Works

1. At execution time, the Conditional node receives upstream context (e.g. the user's input)
2. It sends the condition question to the configured LLM along with that context
3. The LLM responds with "true" or "false"
4. Nodes connected to the **true** output handle execute if the answer is "true"
5. Nodes connected to the **false** output handle execute if the answer is "false"
6. The skipped branch's nodes are marked as skipped and do not produce output

## Example Conditions

```
Does the user's message contain a question?
Is the user asking about pricing?
Is the sentiment of the input negative?
```

## Output Handles

The Conditional node has two output handles:
- **True** (green) — connect nodes that should run when the condition is true
- **False** (red) — connect nodes that should run when the condition is false

## Tips

- Phrase your condition as a yes/no question for reliable LLM evaluation
- Use a fast, cheap model (e.g. `gpt-4o-mini`) for condition evaluation to keep latency low
- Cascading conditionals work — you can chain multiple Conditional nodes
