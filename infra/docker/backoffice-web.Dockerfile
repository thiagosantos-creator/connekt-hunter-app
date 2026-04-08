
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .prettierrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "@connekt-hunter/backoffice-web", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
