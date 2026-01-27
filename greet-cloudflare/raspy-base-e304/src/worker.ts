import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Scalekit, type TokenValidationOptions } from "@scalekit-sdk/node";
import { z } from "zod";

type Env = {
  PROTECTED_RESOURCE_METADATA?: string;
  EXPECTED_AUDIENCE?: string;

  SK_ENV_URL?: string;
  SK_CLIENT_ID?: string;
  SK_CLIENT_SECRET?: string;
};

const TOOLS = {
  greet_user: {
    name: "greet_user",
    description: "Greets the user with a personalized message.",
    requiredScopes: ["usr:read"],
  },
} as const;

type ToolName = keyof typeof TOOLS;

const server = new McpServer({ name: "Greeting MCP", version: "1.0.0" });

server.tool(
  TOOLS.greet_user.name,
  TOOLS.greet_user.description,
  { name: z.string().min(1, "Name is required") },
  async ({ name }) => ({ content: [{ type: "text", text: `Hi ${name}` }] })
);

// ---- ScaleKit client (reused per isolate)
let scalekitClient: Scalekit | null = null;

function getScalekit(env: Env): Scalekit {
  if (!scalekitClient) {
    if (!env.SK_ENV_URL || !env.SK_CLIENT_ID || !env.SK_CLIENT_SECRET) {
      throw new Error("Missing ScaleKit env vars: SK_ENV_URL / SK_CLIENT_ID / SK_CLIENT_SECRET");
    }
    scalekitClient = new Scalekit(env.SK_ENV_URL, env.SK_CLIENT_ID, env.SK_CLIENT_SECRET);
  }
  return scalekitClient;
}

function json(obj: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function withCors(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "WWW-Authenticate");
  return new Response(resp.body, { status: resp.status, headers });
}

function oauthProtectedResourceResponse(env: Env) {
  const metadata = JSON.parse(env.PROTECTED_RESOURCE_METADATA || "{}");
  return json(metadata);
}

async function validateTokenWithScalekitOrJwks(args: {
  token: string;
  audience: string;
  requiredScopes?: string[];
  env: Env;
}) {
  const { token, audience, requiredScopes, env } = args;

  const scalekit = getScalekit(env);

  const options: TokenValidationOptions = {
    audience: [audience]
  };
  if (requiredScopes?.length) options.requiredScopes = requiredScopes;

  await scalekit.validateToken(token, options);
}

async function authMiddleware(request: Request, env: Env) {
  const url = new URL(request.url);

  // public well-known endpoint
  if (url.pathname.includes(".well-known")) return;

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const wwwAuthenticate = `Bearer realm="OAuth", resource_metadata="${url.origin}/.well-known/oauth-protected-resource/mcp"`;

  if (!token) {
    throw new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": wwwAuthenticate },
    });
  }

  const audience = env.EXPECTED_AUDIENCE || "";
  if (!audience) {
    // fail closed
    throw new Response(null, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Determine required scopes for tools/call
  let requiredScopes: string[] | undefined;

  const contentType = request.headers.get("Content-Type") || "";
  if (request.method === "POST" && contentType.includes("application/json")) {
    const body = await request.clone().json().catch(() => null);

    if (body?.method === "tools/call") {
      const toolName = body?.params?.name as ToolName | undefined;
      if (toolName && TOOLS[toolName]) {
        requiredScopes = [...TOOLS[toolName].requiredScopes];
      }
    }
  }

  try {
    await validateTokenWithScalekitOrJwks({ token, audience, requiredScopes, env });
  } catch (err){
    console.log("Akshay " + err)
    throw new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": wwwAuthenticate },
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Mcp-Protocol-Version,Content-Type,Authorization",
          "Access-Control-Expose-Headers": "WWW-Authenticate",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // metadata endpoint
    if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource/mcp") {
      return withCors(oauthProtectedResourceResponse(env));
    }

    // MCP endpoint
    if (request.method === "POST" && url.pathname === "/mcp") {
      try {
        await authMiddleware(request, env);
      } catch (resp) {
        if (resp instanceof Response) return withCors(resp);
        return withCors(new Response(null, { status: 401 }));
      }

      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });

      await server.connect(transport);

      // IMPORTANT: web-standard transport returns a Response directly
      const resp = await transport.handleRequest(request);
      return withCors(resp);
    }

    return new Response("Not found", { status: 404 });
  },
};
