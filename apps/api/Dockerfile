FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build
ENV CI=true
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN ./node_modules/.bin/tsc -p packages/contracts/tsconfig.json && ./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.json

FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runtime
ARG SOURCE_REVISION=4553ae204160f95dfcb0886fe9741566441f3cbc
LABEL org.opencontainers.image.title="Fragments API" \
      org.opencontainers.image.version="v0.1.0-mvp" \
      org.opencontainers.image.revision="$SOURCE_REVISION"
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
RUN mkdir -p /app/data && chown -R node:node /app/data /app
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
