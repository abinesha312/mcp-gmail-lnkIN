FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./

COPY tsconfig.json ./
COPY src ./src

RUN npm install --ignore-scripts && npm run build

RUN mkdir -p /mcp-data /root/.gmail-mcp

ENV NODE_ENV=production
ENV GMAIL_CREDENTIALS_PATH=/mcp-data/credentials.json
ENV GMAIL_OAUTH_PATH=/root/.gmail-mcp/gcp-oauth.keys.json

EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
