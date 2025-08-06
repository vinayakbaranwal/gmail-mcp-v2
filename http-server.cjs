#!/usr/bin/env node

// Gmail MCP Server with slack-mcp compatible endpoints
// Implements separate /sse and /messages endpoints with sessionId query parameters
// Run with: node http-server.cjs

const http = require('http');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.GMAIL_MCP_PORT || 3003;
const SSE_ENDPOINT = '/sse';
const MESSAGES_ENDPOINT = '/messages';

// Session storage
const sessions = new Map();

// Generate secure session ID
function generateSessionId() {
  return crypto.randomUUID();
}

// MCP Server with slack-mcp compatible endpoints
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Last-Event-ID');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE endpoint - handles GET requests for Server-Sent Events
  if (path === SSE_ENDPOINT && method === 'GET') {
    const acceptHeader = req.headers.accept || '';
    
    if (!acceptHeader.includes('text/event-stream')) {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed', message: 'Accept header must include text/event-stream' }));
      return;
    }

    // Generate new session ID for this SSE connection
    const sessionId = generateSessionId();
    console.log('SSE connection established for session:', sessionId);
    
    // Create new session
    sessions.set(sessionId, {
      id: sessionId,
      created: new Date(),
      sseConnection: res
    });
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Last-Event-ID'
    });

    // Send initial endpoint event with sessionId (matching slack-mcp behavior)
    const messageEndpoint = `${MESSAGES_ENDPOINT}?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE connection closed for session:', sessionId);
      // Keep session alive but mark SSE connection as null
      if (sessions.has(sessionId)) {
        sessions.get(sessionId).sseConnection = null;
      }
      res.end();
    });

    return;
  }

  // Messages endpoint - handles POST requests with sessionId query parameter
  if (path === MESSAGES_ENDPOINT && method === 'POST') {
    const sessionId = query.sessionId;
    
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'sessionId query parameter required'
        }
      }));
      return;
    }

    if (!sessions.has(sessionId)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: 'Session not found',
          data: 'Session expired or invalid'
        }
      }));
      return;
    }

    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        console.log('Received MCP message for session', sessionId, ':', message);

        // Get session and SSE connection
        const session = sessions.get(sessionId);
        
        // Handle different MCP methods
        let response;
        
        if (message.method === 'initialize') {
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
                logging: {}
              },
              serverInfo: {
                name: 'gmail-mcp',
                version: '1.0.0'
              }
            }
          };
        } else {
          // Handle other MCP methods
          response = {
            jsonrpc: '2.0',
            id: message.id,
            result: {
              status: 'received',
              message: 'Gmail MCP Server is running',
              capabilities: {
                tools: [
                  'gmail_search',
                  'gmail_send', 
                  'gmail_read',
                  'gmail_list_threads',
                  'gmail_get_thread'
                ],
                resources: [
                  'gmail://messages',
                  'gmail://threads',
                  'gmail://labels'
                ]
              },
              server: 'gmail-mcp',
              transport: 'sse'
            }
          };
        }

        // Send response via SSE if connection exists
        if (session.sseConnection) {
          const responseData = JSON.stringify(response);
          session.sseConnection.write(`event: message\ndata: ${responseData}\n\n`);
        }

        // Also send HTTP 202 Accepted (matching slack-mcp behavior)
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end();
        
      } catch (error) {
        console.error('Error processing message:', error);
        
        const errorResponse = {
          jsonrpc: '2.0',
          id: body ? JSON.parse(body).id : null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error.message
          }
        };

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse, null, 2));
      }
    });

    return;
  }

  // Health check endpoint (for debugging)
  if (path === '/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      server: 'gmail-mcp',
      protocol: 'slack-mcp compatible',
      endpoints: {
        sse: SSE_ENDPOINT,
        messages: MESSAGES_ENDPOINT
      },
      activeSessions: sessions.size,
      sessions: Array.from(sessions.keys())
    }));
    return;
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Path ${path} not found`,
    availableEndpoints: {
      sse: `${SSE_ENDPOINT} (GET)`,
      messages: `${MESSAGES_ENDPOINT} (POST with ?sessionId=xxx)`,
      health: '/health (GET)'
    }
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Gmail MCP Server with slack-mcp compatible endpoints`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}${SSE_ENDPOINT}`);
  console.log(`💬 Messages endpoint: http://localhost:${PORT}${MESSAGES_ENDPOINT}?sessionId=xxx`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('✅ Server matches slack-mcp behavior:');
  console.log('   • GET /sse - Open SSE stream, returns endpoint event with sessionId');
  console.log('   • POST /messages?sessionId=xxx - Send JSON-RPC messages');
  console.log('   • Session management via sessionId query parameter');
  console.log('');
  console.log('🎯 Ready for MCP client connections!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Gmail MCP Server...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});
