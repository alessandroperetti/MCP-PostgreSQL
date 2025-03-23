#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";

interface Prompts {
  prompts: Array<Prompt>;
  tools?: any;
  name?: string;
  inputSchema?: any;
  description?: string;
  _meta?: any;
  cursor?: any;
}
interface Prompt {
  name: string;
  description: string;
}

const server = new Server(
  {
    name: "example-servers/postgresql",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {}, // resources declaration
      tools: {}, // tools declaration
      prompts: {} // prompts declaration
    },
  },
);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a database URL as a command-line argument");
  process.exit(1);
}

const databaseUrl = args[0];

const resourceBaseUrl = new URL(databaseUrl);
resourceBaseUrl.protocol = "postgres:";
resourceBaseUrl.password = "";

const pool = new pg.Pool({
  connectionString: databaseUrl,
});

const SCHEMA_PATH = "schema";

// Prompting addition - List
server.setRequestHandler(ListPromptsRequestSchema, async () => {

  const prompts: Prompts = {
    prompts: [
      {
        name: "schema-addition",
        description: "Add a schema to the query",
      }
    ],
  }
  return prompts;
});

// Prompting addition - Get
server.setRequestHandler(GetPromptRequestSchema, async (query) => {
  return {
    messages: [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Add always in the sql query the schema of the table in order to provide a context for the query"
        }
      }
    ]
  };
});

// Listing resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const client = await pool.connect();
  try {
    const result = await client.query([
      "SELECT table_name AS name, table_schema AS schema",
      "FROM information_schema.tables"].join(" "),
    );
    return {
      resources: result.rows.map((row) => ({
        uri: new URL(`${row.name}/${SCHEMA_PATH}/${row.schema}`, resourceBaseUrl).href,
        mimeType: "application/json",
        name: `"${row.name}" table in schema "${row.schema}"`,
        description: `Table "${row.name}" in schema "${row.schema}"`,
      })),
    };
  } finally {
    client.release();
  }
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resourceUrl = new URL(request.params.uri);

  const pathComponents = resourceUrl.pathname.split("/");
  const schemaName = pathComponents.pop()
  const schema = pathComponents.pop();
  const tableName = pathComponents.pop();

  if (schema !== SCHEMA_PATH) {
    throw new Error("Invalid resource URI");
  }

  const client = await pool.connect();
  try {
    const result = await client.query([
      "SELECT column_name, data_type",
      "FROM information_schema.columns",
      "WHERE table_name = $1",
      "AND table_schema = $2"
    ].join(" "),
      [tableName, schemaName],
    );

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  } finally {
    client.release();
  }
});

// Listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Run a read-only SQL query ",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string" },
          },
        },
      },
    ],
  };
});

// Executing tools requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query") {
    const sql = request.params.arguments?.sql as string;

    const client = await pool.connect();
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      const result = await client.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        isError: false,
      };
    } catch (error) {
      throw error;
    } finally {
      client
        .query("ROLLBACK")
        .catch((error) =>
          console.warn("Could not roll back transaction:", error),
        );

      client.release();
    }
  }
  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PostgreSQL MCP Server running on stdio");
}

main().catch((error) =>{
  console.error("Fatal error in main():", error);
  process.exit(1);
});