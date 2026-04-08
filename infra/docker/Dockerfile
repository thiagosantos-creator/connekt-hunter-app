FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY packages ./packages
COPY turbo.json .prettierrc ./
RUN npm ci
RUN npm run build
CMD ["npm", "run", "test"]
