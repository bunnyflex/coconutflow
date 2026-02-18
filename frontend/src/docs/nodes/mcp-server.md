# MCP Server Node

The MCP (Model Context Protocol) Server node connects your flow to any MCP-compatible tool server. MCP is an open standard for extending LLM agents with external capabilities.

## Configuration

| Field | Description |
|-------|-------------|
| Server URL | The URL of the MCP server (e.g. `http://localhost:3001`) |
| Tool Name | The specific tool to invoke on the server |
| Parameters | JSON object of parameters to pass to the tool |

## What is MCP?

MCP (Model Context Protocol) is a protocol that allows AI applications to connect to external tool servers in a standardised way. An MCP server exposes tools — functions that can be called by an AI agent to perform actions like reading files, querying databases, or calling APIs.

## Typical Use Cases

- Connect to a local filesystem MCP server to read project files
- Use a database MCP server to query your data
- Integrate with third-party MCP servers published by tool vendors

## Self-Hosting an MCP Server

```bash
npx @modelcontextprotocol/server-filesystem /path/to/directory
```

Then set the Server URL to `http://localhost:3001` in the node config.

## Output

Returns the tool's response as a string, passed downstream as context.

## Tips

- MCP servers must be running and accessible from the machine running the CoconutFlow backend
- For production deployments, ensure MCP servers are network-accessible from the backend container
