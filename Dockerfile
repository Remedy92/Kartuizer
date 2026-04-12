# Long-running Express API (Render / Fly / Railway / any container host)
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server

ENV NODE_ENV=production
EXPOSE 8787

RUN apk add --no-cache wget

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-8787}/api/health" || exit 1'

CMD ["npm", "run", "start"]
