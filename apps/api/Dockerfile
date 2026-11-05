FROM node:24.21.0-bookworm-slim AS build
ENV CI=true
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --lockfile=false --ignore-scripts --shamefully-hoist
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN ./node_modules/.bin/tsc -p packages/contracts/tsconfig.json && ./apps/api/node_modules/.bin/tsc -p apps/api/tsconfig.json

FROM node:24.21.0-bookworm-slim AS runtime
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
