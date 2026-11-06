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
COPY apps/web apps/web
RUN ./node_modules/.bin/tsc -p packages/contracts/tsconfig.json && cd apps/web && ./node_modules/.bin/vite build

FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime
ARG SOURCE_REVISION=4553ae204160f95dfcb0886fe9741566441f3cbc
LABEL org.opencontainers.image.title="Fragments web" \
      org.opencontainers.image.version="v0.1.0-mvp" \
      org.opencontainers.image.revision="$SOURCE_REVISION"
COPY deploy/production/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/web/dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
