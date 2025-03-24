#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({
  name: "Gmail-MCP",
  version: "1.0.0",
  description: "An expansive MCP for the Gmail API"
})

// Unified response formatter for both success and error responses
function formatResponse(messageOrData, status = 200) {
  const isError = typeof messageOrData === 'string';
  return {
    content: [{
      type: "text",
      text: JSON.stringify(isError ? { error: messageOrData, status } : messageOrData)
    }]
  }
}

// Helper function for making API requests to <Service>
async function makeApiRequest(endpoint, params = {}, method = 'GET', body = null) {
  const apiKey = process.env.API_KEY
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set")
  }

  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString())
    }
  })

  const url = `https://gmail.googleapis.com/gmail/v1${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const requestOptions = {
    method,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }
  }

  if (body) {
    requestOptions.body = JSON.stringify(body)
    requestOptions.headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, requestOptions)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.message || `Error fetching data from Gmail: ${response.statusText}`)
  }

  return await response.json()
}

// Enhanced API request wrapper with error handling
async function makeApiRequestWithErrorHandling(endpoint, params = {}, method = 'GET', body = null) {
  try {
    const data = await makeApiRequest(endpoint, params, method, body)
    return formatResponse(data)
  } catch (error) {
    return formatResponse(`Error performing request: ${error.message}`, 500)
  }
}

// Wrapper function to handle common endpoint patterns
async function handleEndpoint(apiCall) {
  try {
    return await apiCall()
  } catch (error) {
    return formatResponse(error.message, error.status || 403)
  }
}

server.tool("draft_email",
  "Create a draft email in Gmail",
  {
    to: z.string().describe("Email address of the recipient"),
    subject: z.string().describe("Subject of the email"),
    body: z.string().describe("Body content of the email"),
    cc: z.string().optional().describe("CC recipients (comma-separated email addresses)"),
    bcc: z.string().optional().describe("BCC recipients (comma-separated email addresses)")
  },
  async (params) => {
    return handleEndpoint(async () => {
      const message = {
        raw: Buffer.from(
          `To: ${params.to}\n` +
          (params.cc ? `Cc: ${params.cc}\n` : '') +
          (params.bcc ? `Bcc: ${params.bcc}\n` : '') +
          `Subject: ${params.subject}\n\n` +
          params.body
        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      };

      const data = await makeApiRequestWithErrorHandling(
        '/users/me/drafts',
        {},
        'POST',
        { message }
      );
      return formatResponse(data);
    });
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
