# syntax=docker/dockerfile:1

# One Dockerfile for every workspace app: `APP_NAME` selects what to run, and
# the library packages are built once and shared by all of them.
ARG NODE_VERSION=22-alpine

# --- dependencies -----------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Only manifests are copied first so the install layer is cached until a
# dependency actually changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY packages/prisma/package.json packages/prisma/
COPY apps/auth-service/package.json apps/auth-service/
COPY apps/quiz-service/package.json apps/quiz-service/
COPY apps/worker/package.json apps/worker/
COPY apps/gateway/package.json apps/gateway/

# Scripts stay enabled: bcrypt needs its prebuilt native binary.
RUN npm ci

# --- build ------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY packages ./packages
COPY apps ./apps

# Generates the Prisma client into packages/prisma/generated, then compiles the
# libraries and every application.
RUN npm run prisma:generate && npm run build

# --- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ARG APP_NAME
ENV NODE_ENV=production \
    APP_NAME=${APP_NAME}

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps

# The node image ships an unprivileged `node` user.
USER node

# Shell form so APP_NAME can be expanded at runtime.
CMD ["sh", "-c", "node apps/${APP_NAME}/dist/main.js"]
