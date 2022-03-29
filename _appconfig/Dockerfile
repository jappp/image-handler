

FROM registry.qunhequnhe.com/infra/base-builder-v12:latest as builder

RUN mkdir /approot
WORKDIR /approot
COPY . /approot

RUN npm add node-prom-probe \
&& npm config set sharp_binary_host "https://npm.taobao.org/mirrors/sharp" \
&& npm config set sharp_libvips_binary_host "https://npm.taobao.org/mirrors/sharp-libvips"  \
&& npm install \
&& npm run build


FROM node:12-alpine3.12
RUN mkdir /approot
WORKDIR /approot
COPY --from=builder /approot /approot
RUN ls /approot

CMD scfConfig=${SCFCONFIG} stage=${STAGE} domain=${DOMAIN} region=${REGION} ALINODE_APP_ID=${ALINODE_APP_ID} ALINODE_APP_SECRET=${ALINODE_APP_SECRET} node -r node-prom-probe/index /approot/dist/index.js

