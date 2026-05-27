FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/server apps/server

RUN pnpm server:build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/server/dist apps/server/dist

EXPOSE 3000

CMD ["pnpm", "server:start"]
