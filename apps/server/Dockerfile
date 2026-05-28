FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/server/nest-cli.json apps/server/tsconfig.json apps/server/tsconfig.build.json apps/server/
COPY apps/server/src apps/server/src
COPY apps/server/prisma apps/server/prisma

RUN pnpm db:generate
RUN pnpm server:build

RUN pnpm --filter @crm/server deploy --prod /prod/server \
  && generated_dir="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma' -type d | head -n 1)" \
  && client_dir="$(find /prod/server/node_modules/.pnpm -path '*/node_modules/@prisma/client' -type d | head -n 1)" \
  && test -n "$generated_dir" \
  && test -n "$client_dir" \
  && cp -R "$generated_dir" "$(dirname "$(dirname "$client_dir")")/.prisma"

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3000

COPY --from=build /prod/server ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
