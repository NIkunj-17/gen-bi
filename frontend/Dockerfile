FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json .
RUN npm install

# Copy source
COPY . .

# Build for production
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80