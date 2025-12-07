FROM node:24-alpine3.21 AS builder

WORKDIR /app

COPY package.json yarn.lock ./

#gets dev+prod once, caches tarballs
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build \
 && YARN_CACHE_FOLDER=.yarncache \
 && yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline --modules-folder /app/prod_node_modules\
 && rm -rf .yarncache

FROM node:24-alpine3.21 AS runner

WORKDIR /app

# Alpine images require addgroup/adduser instead of useradd/groupadd
# Alpine’s base image uses BusyBox userland, which doesn’t ship Debian/Ubuntu’s shadow-utils (useradd/groupadd); instead it has BusyBox versions adduser/addgroup with different flags
# BusyBox is a single, tiny binary that bundles many core Unix utilities (ls, cp, sh, etc.)
# Create a custom user with UID 1111 and GID 1111
RUN addgroup -g 1111 appgroup \
    && adduser -D -u 1111 -G appgroup -s /bin/sh appuser

COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/yarn.lock ./yarn.lock
COPY --from=builder --chown=appuser:appgroup /app/prod_node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

USER appuser

CMD ["yarn", "start"]
