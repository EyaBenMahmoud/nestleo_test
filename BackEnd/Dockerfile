# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Final stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app /app
# Copy the certificate files
COPY fullchain.pem /app/fullchain.pem
COPY privkey.pem /app/privkey.pem
RUN apk add --no-cache libreoffice-writer libreoffice-calc \
    && rm -rf /var/cache/apk/*
EXPOSE 8005
CMD ["node", "./bin/www"]
