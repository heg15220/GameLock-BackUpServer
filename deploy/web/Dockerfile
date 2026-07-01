# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app

ARG SITE_URL=https://www.game-lock.com
ENV NODE_ENV=production
ENV SITE_URL=${SITE_URL}
ENV VITE_SITE_URL=${SITE_URL}

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts

RUN npm run build

FROM nginx:1.27-alpine

ENV DOMAIN=localhost

RUN apk add --no-cache openssl

COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf
COPY deploy/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/docker-entrypoint.d/40-create-self-signed-cert.sh /docker-entrypoint.d/40-create-self-signed-cert.sh
COPY deploy/nginx/docker-entrypoint.d/50-watch-certificates.sh /docker-entrypoint.d/50-watch-certificates.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x \
      /docker-entrypoint.d/40-create-self-signed-cert.sh \
      /docker-entrypoint.d/50-watch-certificates.sh \
 && mkdir -p /var/www/certbot

VOLUME ["/etc/letsencrypt", "/var/www/certbot"]
EXPOSE 80 443
