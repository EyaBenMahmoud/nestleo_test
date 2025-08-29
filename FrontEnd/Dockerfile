FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Set environment variables - these will be overridden by .env.production
ENV REACT_APP_API_URL=https://nestleo.com:8005
ENV REACT_APP_SOCKET_URL=https://nestleo.com:8005
ENV NODE_OPTIONS=--no-deprecation

# Build the app
RUN npx react-scripts build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY privkey.pem /etc/nginx/ssl/privkey.pem
COPY fullchain.pem /etc/nginx/ssl/fullchain.pem
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
