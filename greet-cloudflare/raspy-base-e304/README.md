# Deploy MCP server on Cloudflare Workers

This example Greet MCP server demonstrates how an MCP server protected by Scalekit can be deployed on Cloudflare Workers.

## Setup at Cloudflare
1. Go to your cloudflare dashboard and navigate to Workers & Pages
2. Click on Create Application and choose feasible option (eg. Connect with GitHub). In this example, we select "Start with Hello World!" and we will modify the code using wrangler

## Scalekit MCP server registration
1. Go to `app.scalekit.com`
2. Navigate to `MCP Servers` on left navigation bar
3. Click on `Add MCP Server`
4. Fill in the following details
    - Name: `Greet-Cloudflare-Local`
    - Server URL: `http://localhost:8787/mcp`
    - Allow dynamic client registration: `Yes`
    - Allow Client ID Metadata Document (CIMD): `Yes`
    - Expand `Advanced Configuration`
    - Access Token Expiry: `60` mins
    - Click on `Add New Scope` -> scope.name = `usr:read` scope.description = `Read data`
    - Select `usr:read` from the list and click on Save
5. Copy the generated Protected Resouce Metadata and Server Url as we will need it in local setup.

## Local system setup
1. In your terminal navigate to this file's path and change the folder name from raspy-base-e304 to your cloudflare generated worker name.
2. Install wrangler and login to it. 
`npm install -g wrangler`
`wrangler login`
3. Pull existing worker from the  cloudflare `wrangler init greeting-mcp-server --from-dash raspy-base-e304`, where `raspy-base-e304` is the worker name. Change it to match your generated worker name.
4. Update wrangler.jsonc file with your Worker Name, PROTECTED_RESOURCE_METADATA, EXPECTED_AUDIENCE, SK_ENV_URL, SK_CLIENT_ID
5. Install dependencies: `npm install`
6. Put the secret using wrangler. `wrangler secret put SK_CLIENT_SECRET`

## Test in local
1. For local testing you can set the secret in your terminal's environment variable.
2. Run in local: `wrangler dev`. It should start your service on `http://localhost:8787` and your MCP mounter at `/mcp`.
3. We will use MCP-Jam as the inspector tool to test the MCP. You can run this command in a new terminal to start mcp-jam: `npx @mcpjam/inspector@latest`
4. This should open mcp-jam in your default browser. Click on `Add Server` -> provide your MCP server's URL - `http://localhost:8787/mcp` -> Choose OAuth 2.0 as Authentication type and click on `Add Server`. And click on the toggle button to initiate connection. Tip: In case if connection fails, Navigate to OAuth Debugger of MCP Jam and proceed step by step to see where it's failing
5. Run the `greet_user` with name as `John` and check the output.

## Deploy on Cloudflare
1. Go to Scalekit Dashboard and Add a new MCP Server with the following details:
    - Name: `Greet-Cloudflare-Managed`
    - Server URL: `https://your-cloudflare-worker-domain/mcp` (eg. https://raspy-base-e304.akshay-parihar.workers.dev/mcp)
    - Allow dynamic client registration: `Yes`
    - Allow Client ID Metadata Document (CIMD): `Yes`
    - Expand `Advanced Configuration`
    - Access Token Expiry: `60` mins
    - Select `usr:read` from the list and click on Save
2. Copy the generated Protected Resouce Metadata and Server Url and update the values accordingly in wrangler.jsonc.
3. Run the command to deploy `wrangler deploy`

## Test the MCP deployed in Cloudflare Workers
1. We will use MCP-Jam as the inspector tool to test the MCP. You can run this command in a new terminal to start mcp-jam: `npx @mcpjam/inspector@latest`
2. This should open mcp-jam in your default browser. Click on `Add Server` -> provide your MCP server's URL - `https://your-cloudflare-worker-domain/mcp` -> Choose OAuth 2.0 as Authentication type and click on `Add Server`. And click on the toggle button to initiate connection. Tip: In case if connection fails, Navigate to OAuth Debugger of MCP Jam and proceed step by step to see where it's failing
3. Run the `greet_user` with name as `John` and check the output.
