FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

ENV PORT=3000 \
  PUPPETEER_SKIP_DOWNLOAD=1 \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  PUPPETEER_NO_SANDBOX=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY app.js ./
COPY db ./db
COPY middleware ./middleware
COPY routes ./routes
COPY scripts ./scripts
COPY services ./services
COPY views ./views
COPY public ./public

RUN mkdir -p /app/data \
  && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "app.js"]
