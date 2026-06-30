FROM node:18-alpine AS build
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
COPY web/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE ${PORT:-3000}
ENTRYPOINT ["./docker-entrypoint.sh"]
