# Firecrawl Scrape Node

The Firecrawl node scrapes a web page and returns its content as clean markdown. It is useful when you need full page content rather than search snippets.

## Configuration

| Field | Description |
|-------|-------------|
| URL | The web page to scrape (can be a static URL or taken from upstream output) |
| API Key | Your Firecrawl API key (get one at firecrawl.dev) |

## Requirements

- A Firecrawl account and API key — sign up at [firecrawl.dev](https://firecrawl.dev)
- The target URL must be publicly accessible

## Output

Returns the page content as clean markdown, with navigation, ads, and boilerplate removed. Well-structured pages produce the best results.

## Typical Usage

```
Input (URL) -> Firecrawl -> LLM Agent -> Output
```

Or as part of a research pipeline:

```
Input -> Web Search -> Firecrawl -> LLM Agent (Summariser) -> Output
```

## Tips

- Store your Firecrawl API key in the Keys page so it is available without hardcoding
- Firecrawl handles JavaScript-rendered pages; DuckDuckGo Web Search does not
- For bulk scraping (multiple URLs), consider the Apify node with an appropriate actor
