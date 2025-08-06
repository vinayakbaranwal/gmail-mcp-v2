FROM node:lts-alpine

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV MCP_CONFIG_DIR=/home/node/.gmail-mcp
ENV GMAIL_MCP_PORT=3003

# Create logging directory with proper ownership
RUN mkdir -p /home/node/.gmail-mcp && \
    chown -R node:node /home/node/.gmail-mcp && \
    chmod -R 755 /home/node/.gmail-mcp

COPY --chown=node:node package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

COPY --chown=node:node src/ ./src/
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node http-server.cjs ./

# Build the TypeScript project
RUN npm run build

# Clean up devDependencies to reduce image size
RUN npm prune --production

# Expose the HTTP server port
EXPOSE 3003

USER node

# Run HTTP server by default for production deployment
# Use 'docker run -it <image> pnpm run start' for stdio mode if needed
ENTRYPOINT ["node", "http-server.cjs"]
