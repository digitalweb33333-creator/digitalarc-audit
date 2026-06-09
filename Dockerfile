# Image portable (Railway / Render / tout hébergeur Docker)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
# Le port réel est fourni par l'hébergeur via $PORT (lu par src/lib/config.js)
EXPOSE 3000
CMD ["node", "src/server.js"]
