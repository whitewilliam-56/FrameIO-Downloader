FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src/ ./src/

RUN mkdir -p /app/downloads /app/data

VOLUME ["/app/downloads", "/app/data"]

CMD ["node", "src/server.js"]
