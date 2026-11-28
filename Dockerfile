FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Losse, kleine dependencies voor de ingest-worker (draait buiten Next.js).
FROM node:22-bookworm-slim AS worker-deps
WORKDIR /w
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund --save-exact pg@8.23.1 fast-xml-parser@5.12.1 @anthropic-ai/sdk@1.14.0 openai@7.65.0

FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG APP_COMMIT=unknown
ENV APP_COMMIT=$APP_COMMIT
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/db ./db
COPY --from=build --chown=node:node /app/data ./data
COPY --from=worker-deps --chown=node:node /w/node_modules ./scripts/node_modules
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=8s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(6000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
