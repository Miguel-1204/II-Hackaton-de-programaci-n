FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY index.js ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle.config.js ./
COPY drizzle ./drizzle

USER node
EXPOSE 3000

CMD ["npm", "start"]
