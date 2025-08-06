# Gmail MCP Production Deployment Guide

## 🚀 Docker Production Deployment

This guide covers deploying Gmail MCP with slack-mcp compatible endpoints on a production server using Docker.

### Prerequisites

1. **Docker and Docker Compose** installed on your production server
2. **Gmail OAuth credentials** (`gcp-oauth.keys.json`)
3. **Port 3003** available (or configure a different port)

### Quick Start

1. **Clone and prepare the project:**
```bash
git clone <your-repo>
cd gmail-mcp
```

2. **Set up OAuth credentials:**
```bash
# Copy your OAuth credentials file
cp /path/to/your/gcp-oauth.keys.json ./gcp-oauth.keys.json
```

3. **Deploy with Docker Compose:**
```bash
# Basic deployment (Gmail MCP only)
docker-compose up -d

# With Nginx reverse proxy
docker-compose --profile proxy up -d
```

### Configuration

#### Environment Variables

- `GMAIL_MCP_PORT`: HTTP server port (default: 3003)
- `NODE_ENV`: Set to 'production' for production deployment
- `MCP_CONFIG_DIR`: Configuration directory (default: /home/node/.gmail-mcp)

#### Docker Compose Configuration

```yaml
# docker-compose.yml
services:
  gmail-mcp:
    build: .
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - GMAIL_MCP_PORT=3003
    volumes:
      - ./gcp-oauth.keys.json:/app/gcp-oauth.keys.json:ro
      - gmail-mcp-data:/home/node/.gmail-mcp
```

### Endpoints

The Gmail MCP server exposes slack-mcp compatible endpoints:

- **SSE Endpoint**: `http://localhost:3003/sse`
  - GET request with `Accept: text/event-stream`
  - Returns `event: endpoint\ndata: /messages?sessionId=xxx`

- **Messages Endpoint**: `http://localhost:3003/messages?sessionId=xxx`
  - POST request with JSON-RPC messages
  - Returns HTTP 202 Accepted
  - Responses sent via SSE stream

- **Health Check**: `http://localhost:3003/health`
  - GET request for server health status

### Production Deployment Options

#### Option 1: Direct Docker Deployment
```bash
# Build and run directly
docker build -t gmail-mcp .
docker run -d \
  -p 3003:3003 \
  -v $(pwd)/gcp-oauth.keys.json:/app/gcp-oauth.keys.json:ro \
  -v gmail-mcp-data:/home/node/.gmail-mcp \
  --name gmail-mcp \
  gmail-mcp
```

#### Option 2: Docker Compose (Recommended)
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f gmail-mcp

# Stop services
docker-compose down
```

#### Option 3: With Nginx Reverse Proxy
```bash
# Deploy with Nginx proxy
docker-compose --profile proxy up -d

# Access via standard HTTP ports
curl http://your-server/sse
curl -X POST http://your-server/messages?sessionId=xxx
```

### Health Monitoring

The server includes a health check endpoint:

```bash
# Check server health
curl http://localhost:3003/health

# Expected response:
{
  "status": "healthy",
  "server": "gmail-mcp",
  "protocol": "slack-mcp compatible",
  "endpoints": {
    "sse": "/sse",
    "messages": "/messages"
  },
  "activeSessions": 0,
  "sessions": []
}
```

### Security Considerations

1. **OAuth Credentials**: Keep `gcp-oauth.keys.json` secure and read-only
2. **Network Security**: Use Nginx reverse proxy for SSL/TLS termination
3. **Rate Limiting**: Nginx configuration includes basic rate limiting
4. **CORS**: Configured for MCP client compatibility

### Scaling and Performance

- **Memory**: Container configured with 4GB max heap size
- **Sessions**: In-memory session storage (consider Redis for multi-instance)
- **Connections**: Supports concurrent SSE connections
- **Health Checks**: Built-in Docker health checks

### Troubleshooting

#### Common Issues:

1. **Port conflicts**: Change `GMAIL_MCP_PORT` environment variable
2. **OAuth errors**: Verify `gcp-oauth.keys.json` is properly mounted
3. **Permission issues**: Ensure proper file ownership in container

#### Logs:
```bash
# View container logs
docker-compose logs -f gmail-mcp

# Debug mode
docker-compose exec gmail-mcp sh
```

### Integration with MCP Clients

The server is fully compatible with MCP clients that work with slack-mcp:

```javascript
// Example client connection
const sseUrl = 'http://your-server:3003/sse';
const eventSource = new EventSource(sseUrl);

eventSource.addEventListener('endpoint', (event) => {
  const messageEndpoint = event.data; // "/messages?sessionId=xxx"
  // Use messageEndpoint for POST requests
});
```

### Maintenance

#### Updates:
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Backup:
```bash
# Backup OAuth data and sessions
docker run --rm -v gmail-mcp-data:/data -v $(pwd):/backup alpine tar czf /backup/gmail-mcp-backup.tar.gz /data
```

---

## 🎯 Production Ready Features

✅ **Slack-MCP Compatible**: Exact endpoint and session management parity  
✅ **Docker Containerized**: Production-ready container with security best practices  
✅ **Health Monitoring**: Built-in health checks and monitoring endpoints  
✅ **Reverse Proxy Ready**: Nginx configuration for SSL termination and load balancing  
✅ **Session Management**: Persistent sessions with sessionId query parameters  
✅ **CORS Configured**: Ready for cross-origin MCP client connections  

Your Gmail MCP server is now production-ready! 🚀
