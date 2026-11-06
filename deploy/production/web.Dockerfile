FROM node:24.21.0-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @fragments/contracts build && pnpm --filter @fragments/web build

FROM nginx:1.29-alpine AS runtime
COPY deploy/production/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/web/dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
