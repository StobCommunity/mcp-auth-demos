# FastMCP MCP Server with Scalekit Authentication

A production-ready Python-based Model Context Protocol (MCP) server using [FastMCP](https://github.com/scalekit-inc/fastmcp) with Scalekit OAuth 2.1 authentication integration.

## Features

- **Scalekit OAuth 2.1**: Secure authentication with scope-based authorization
- **FastMCP Backend**: Modern, fast Python MCP server
- **Simple Tool Registration**: Easily add new tools
- **.env Support**: Environment-based configuration

## Quick Start

### Register your MCP server on Scalekit
1. Login to your [Scalekit Dashboard](https://app.scalekit.com) -> MCP Servers -> Add MCP Server
2. Server URL = `http://localhost:3002/` should have a trailing slash
3. Create a scope called `usr:read` with description `Read user information`, select it -> Save

### MCP server runtime

1. **Create Virtual Environment** (Python 3.11+ required):
	```bash
	python3.11 -m venv venv
	source venv/bin/activate
	```

2. **Install Dependencies**:
	```bash
	pip install -r requirements.txt
	```

3. **Configure Environment**:
	```bash
	cp env.example .env
	# Edit .env with your Scalekit credentials and server settings
	```

	- `PORT`: (optional) The port the server will listen on. Defaults to 3002.
	- `SCALEKIT_ENVIRONMENT_URL`: Your Scalekit environment URL (required).
	- `SCALEKIT_CLIENT_ID`: Your Scalekit client ID (required).
	- `SCALEKIT_RESOURCE_ID`: Your Scalekit MCP server resource ID (required).
	- `MCP_URL`: The MCP server URL as registered in the Scalekit dashboard (required; e.g., `http://localhost:3002/`). This MUST have a trailing slash.

	> **Note:** After editing `.env`, restart the server for changes to take effect.

4. **Run the Server**:
	```bash
	python server.py
	```

	The server will start on `http://localhost:3002/` (or the port you set in `.env`).

## Available Tools

### greet_user
- **Description**: Greets a user with a personalized message. It checks for scopes before responding.
- **Scopes Required**: `usr:read`
- **Parameters**: `name` (string) - The name of the user to greet

## Authentication

The server implements Scalekit OAuth 2.1 authentication:

- **Bearer Token Validation**: All MCP requests require valid Bearer tokens
- **Public Endpoints**: OAuth discovery and health check endpoints are publicly accessible
- **OAuth 2.1 Compliance**: Returns proper error responses

## API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/.well-known/oauth-protected-resource` | GET | OAuth 2.1 metadata discovery | No |
| `/mcp` | POST | MCP protocol communication | Yes |

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SCALEKIT_ENVIRONMENT_URL` | Scalekit environment URL | - | Yes |
| `SCALEKIT_CLIENT_ID` | Scalekit client ID | - | Yes |
| `SCALEKIT_RESOURCE_ID` | Scalekit MCP server resource ID | - | Yes |
| `MCP_URL` | The MCP server URL as registered in the Scalekit dashboard (e.g., `http://localhost:3002/`). This MUST have a trailing slash.  | - | Yes |
| `PORT` | Server port | `3002` | No |

## Development

### Adding New Tools

1. **Define and register the tool** in `server.py`:
	```python
	@mcp.tool
	def your_tool(param: str) -> str:
		 """Describe your tool here."""
		 return "result"
	```

2. **Document the tool** in this README under "Available Tools".

## License

This project is licensed under the MIT License.
