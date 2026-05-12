# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps first for better caching
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY prisma ./prisma

RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "dist/server.js"]

