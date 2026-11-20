FROM nginx:1.29-alpine@sha256:5616878291a2eed594aee8db4dade5878cf7edcb475e59193904b198d9b830de AS runtime
ARG SOURCE_REVISION=unknown
ARG RELEASE_VERSION=unknown
ARG NGINX_CONFIG=deploy/production/nginx.conf
LABEL org.opencontainers.image.title="Fragments web" \
      org.opencontainers.image.version="$RELEASE_VERSION" \
      org.opencontainers.image.revision="$SOURCE_REVISION"
COPY ${NGINX_CONFIG} /etc/nginx/nginx.conf
COPY apps/web/dist/ /usr/share/nginx/html/
USER 101:101
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
