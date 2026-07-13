# ---------- Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Production ----------
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist/src ./dist
COPY --from=builder /app/dist/mail ./dist/mail

EXPOSE 3000

USER node

CMD ["sh", "-c", "npm run migration:run && node dist/main.js"]
