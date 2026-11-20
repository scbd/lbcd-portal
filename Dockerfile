FROM node:26-alpine AS build

# bower resolves its packages from git repositories
RUN apk add --no-cache git

WORKDIR /usr/src/app

COPY package.json package-lock.json bower.json .bowerrc ./

RUN npm ci --no-audit --no-fund \
 && npm prune --omit=dev --no-audit --no-fund \
 && rm -rf .bower-storage

FROM node:26-alpine

WORKDIR /usr/src/app

ENV PORT=8000
EXPOSE 8000

ARG VERSION
ENV VERSION=$VERSION

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/lbcd/app/libs ./lbcd/app/libs
COPY . ./

USER node

CMD [ "node", "server" ]
