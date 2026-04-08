
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .prettierrc ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @connekt-hunter/api build
CMD ["pnpm", "--filter", "@connekt-hunter/api", "start:dev"]
