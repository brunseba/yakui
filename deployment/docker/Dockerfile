# Dependencies stage
FROM node:18-alpine as dependencies

WORKDIR /app

# Copy package files first for better layer caching
COPY ../../package.json ../../package-lock.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy configuration files
COPY ../../config ./config
# Copy package.json for scripts
COPY ../../package.json ./
# Copy application source
COPY ../../app ./app
# Copy tools (for dev-server if needed)
COPY ../../tools ./tools

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY ../../config/nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user and set permissions
RUN adduser -D -s /bin/sh nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

USER nginx

EXPOSE 8080

# Add labels for better container management
LABEL maintainer="Kubernetes Admin UI" \
      version="1.0.0" \
      description="Production-ready Kubernetes Admin UI"

CMD ["nginx", "-g", "daemon off;"]
