# Web Search Node

The Web Search node runs a DuckDuckGo search query and returns the top results as structured text. No API key required.

## Configuration

| Field | Description |
|-------|-------------|
| Max Results | Number of search results to return (default: 5, max: 20) |

## Behaviour

- The search query is taken from upstream node output (typically an Input node)
- Results include title, URL, and snippet for each result
- All results are concatenated and passed downstream as a single text block

## Typical Usage

Connect an Input node directly to a Web Search node, then feed the results into an LLM Agent to summarise or analyse:

```
Input -> Web Search -> LLM Agent -> Output
```

The LLM Agent receives the raw search results as context and can synthesise an answer.

## Limitations

- DuckDuckGo results are snippets only — not full page content. For full page scraping, use the Firecrawl node instead.
- Search results may vary by region and DuckDuckGo's index freshness
- Rate limits apply if you run many searches in rapid succession

## Tips

- Keep queries concise and specific for better results
- Use an LLM Agent upstream to reformulate the user's question into a better search query before passing it to Web Search
