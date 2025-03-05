FROM node:22-bookworm-slim AS builder

COPY ui /app/ui

WORKDIR /app/ui
RUN rm -rf node_modules && npm ci
RUN npm run build

FROM joseluisq/static-web-server:2

COPY --from=builder /app/ui/dist /app/ui
COPY .docker/config.toml /

ENV SERVER_CONFIG_FILE=config.toml
