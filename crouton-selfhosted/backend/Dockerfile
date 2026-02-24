# backend/Dockerfile — Multi-stage, non-root, Alpine

FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup -S crouton && adduser -S crouton -G crouton

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=crouton:crouton src ./src
COPY --chown=crouton:crouton package*.json ./

# Create uploads directory
RUN mkdir -p /app/uploads && chown crouton:crouton /app/uploads

USER crouton
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
