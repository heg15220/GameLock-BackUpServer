# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY server ./server

RUN mkdir -p /app/server/data \
 && chown -R node:node /app/server/data

USER node
EXPOSE 8791 8792 8793

CMD ["node", "server/wikipedia-gacha/index.mjs"]
