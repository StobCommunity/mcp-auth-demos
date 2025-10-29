"""Scalekit OAuth server example for FastMCP.

This example demonstrates how to protect a FastMCP server with Scalekit OAuth.

Required environment variables:
- SCALEKIT_ENVIRONMENT_URL: Your Scalekit environment URL (e.g., "https://your-env.scalekit.com")
- SCALEKIT_CLIENT_ID: Your Scalekit OAuth application client ID
- SCALEKIT_RESOURCE_ID: Your Scalekit resource ID
- MCP_URL: The base URL where this MCP server will be hosted (with trailing slash). It should match the URL configured in Scalekit Dashboard.

To run:
    python server.py
"""

import os
from fastmcp import FastMCP
from fastmcp.server.auth.providers.scalekit import ScalekitProvider
from fastmcp.server.dependencies import get_access_token, AccessToken
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

mcp = FastMCP("Greeting Server", stateless_http=True, auth=ScalekitProvider(
    environment_url=os.getenv("SCALEKIT_ENVIRONMENT_URL"),
    client_id=os.getenv("SCALEKIT_CLIENT_ID"),
    resource_id=os.getenv("SCALEKIT_RESOURCE_ID"),
    # Fastmcp automatically appends /mcp so provide base URL only with a trailing slash in mcp_url and in Scalekit Dashboard. eg: "http://localhost:3002/"
    mcp_url=os.getenv("MCP_URL"),
))


@mcp.tool
def greet_user(name: str) -> str:
    """Return a personalized greeting for the authenticated user."""
    token: AccessToken = get_access_token()
    if "usr:read" not in token.scopes: # keep scope validation closer to tool
        return f"You dont have sufficient permissions to access this tool."
    return f"Welcome to Scalekit, {name}."


if __name__ == "__main__":
    mcp.run(transport="http", port=int(os.getenv("PORT", "3002")))