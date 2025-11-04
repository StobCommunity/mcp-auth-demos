"""Scalekit-authenticated FastMCP server providing in-memory CRUD tools for todos.

This example mirrors the greeting-fastmcp project structure while exposing
todo management capabilities through FastMCP tools.
"""

import os
import uuid
from dataclasses import dataclass, asdict
from typing import Optional

from dotenv import load_dotenv
from fastmcp import FastMCP
from fastmcp.server.auth.providers.scalekit import ScalekitProvider
from fastmcp.server.dependencies import AccessToken, get_access_token

# Load environment variables from .env file when available.
load_dotenv()

mcp = FastMCP(
    "Todo Server",
    stateless_http=True,
    auth=ScalekitProvider(
        environment_url=os.getenv("SCALEKIT_ENVIRONMENT_URL"),
        client_id=os.getenv("SCALEKIT_CLIENT_ID"),
        resource_id=os.getenv("SCALEKIT_RESOURCE_ID"),
        # FastMCP appends /mcp automatically; keep base URL with trailing slash only.
        mcp_url=os.getenv("MCP_URL"),
    ),
)


@dataclass
class TodoItem:
    """Simple representation of a todo item stored in memory."""

    id: str
    title: str
    description: Optional[str]
    completed: bool = False

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the todo item."""
        return asdict(self)


# Module-level storage keeps todos available for the lifetime of the process.
_TODO_STORE: dict[str, TodoItem] = {}


def _require_scope(scope: str) -> tuple[bool, Optional[str]]:
    """Validate that the active token contains the expected scope."""
    token: AccessToken = get_access_token()
    if scope not in token.scopes:
        return False, f"Insufficient permissions: `{scope}` scope required."
    return True, None


@mcp.tool
def create_todo(title: str, description: Optional[str] = None) -> dict:
    """Create a new todo item."""
    ok, error = _require_scope("todo:write")
    if not ok:
        return {"error": error}

    todo = TodoItem(id=str(uuid.uuid4()), title=title, description=description)
    _TODO_STORE[todo.id] = todo

    return {"todo": todo.to_dict()}


@mcp.tool
def list_todos(completed: Optional[bool] = None) -> dict:
    """List all todos, optionally filtering by completion state."""
    ok, error = _require_scope("todo:read")
    if not ok:
        return {"error": error}

    todos = [
        todo.to_dict()
        for todo in _TODO_STORE.values()
        if completed is None or todo.completed == completed
    ]
    return {"todos": todos}


@mcp.tool
def get_todo(todo_id: str) -> dict:
    """Fetch a single todo by its identifier."""
    ok, error = _require_scope("todo:read")
    if not ok:
        return {"error": error}

    todo = _TODO_STORE.get(todo_id)
    if todo is None:
        return {"error": f"Todo `{todo_id}` not found."}

    return {"todo": todo.to_dict()}


@mcp.tool
def update_todo(
    todo_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    completed: Optional[bool] = None,
) -> dict:
    """Update fields on an existing todo."""
    ok, error = _require_scope("todo:write")
    if not ok:
        return {"error": error}

    todo = _TODO_STORE.get(todo_id)
    if todo is None:
        return {"error": f"Todo `{todo_id}` not found."}

    if title is not None:
        todo.title = title
    if description is not None:
        todo.description = description
    if completed is not None:
        todo.completed = completed

    return {"todo": todo.to_dict()}


@mcp.tool
def delete_todo(todo_id: str) -> dict:
    """Remove a todo from the store."""
    ok, error = _require_scope("todo:write")
    if not ok:
        return {"error": error}

    todo = _TODO_STORE.pop(todo_id, None)
    if todo is None:
        return {"error": f"Todo `{todo_id}` not found."}

    return {"deleted": todo_id}


if __name__ == "__main__":
    mcp.run(transport="http", port=int(os.getenv("PORT", "3002")))
