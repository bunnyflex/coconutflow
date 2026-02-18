# Apify Actor Node

The Apify node runs any Apify actor and returns its output as structured data. Apify offers hundreds of pre-built scrapers and automation actors.

## Configuration

| Field | Description |
|-------|-------------|
| Actor ID | The Apify actor identifier (e.g. `apify/web-scraper`) |
| Input | JSON configuration passed to the actor |
| API Key | Your Apify API token |

## Requirements

- An Apify account — sign up at [apify.com](https://apify.com)
- Your API token from the Apify console

## Finding Actor IDs

Browse actors at [apify.com/store](https://apify.com/store). Each actor page shows its ID in the format `username/actor-name`.

Popular actors:
- `apify/web-scraper` — general web scraping
- `apify/cheerio-scraper` — fast HTML scraping
- `apify/playwright-scraper` — JavaScript-heavy sites

## Input Format

The Input field accepts a JSON object matching the actor's input schema. Refer to the actor's documentation on the Apify store for the exact fields.

Example for a simple URL scraper:

```json
{
  "startUrls": [{ "url": "https://example.com" }],
  "maxCrawlingDepth": 1
}
```

## Output

Returns the actor's dataset output as a JSON string, which can be processed by a downstream LLM Agent.

## Tips

- Save your Apify API token in the Keys page
- Actor runs are billed to your Apify account; check pricing before running expensive actors in a loop
