FROM node:20-alpine AS build

WORKDIR /app

COPY source/backend/package.json source/backend/package-lock.json ./
RUN npm ci

COPY source/backend/tsconfig.json ./
COPY source/backend/src ./src

RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY source/backend/package.json source/backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY source/backend/sql ./sql

CMD ["node", "dist/index.js"]
