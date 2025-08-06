import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// SSE endpoint
app.get('/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  // Send initial connection event
  res.write('data: {"type":"connection","status":"connected"}\n\n');
  
  // Keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    res.end();
  });
});

// Messages endpoint for MCP communication
app.post('/messages', async (req, res) => {
  try {
    const message = req.body;
    console.log('Received message:', message);
    
    // Return MCP-compatible response
    res.json({ 
      jsonrpc: '2.0',
      id: message.id,
      result: {
        status: 'received',
        message: 'Gmail MCP Server is running',
        capabilities: {
          tools: ['gmail_search', 'gmail_send', 'gmail_read'],
          resources: ['gmail://messages', 'gmail://threads']
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message
      }
    });
  }
});

const port = process.env.GMAIL_MCP_PORT || 8000;
app.listen(port, () => {
  console.log(`Gmail MCP Server listening on port ${port}`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
  console.log(`Messages endpoint: http://localhost:${port}/messages`);
  console.log('Server is ready for MCP client connections');
});
