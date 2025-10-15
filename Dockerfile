# Multi-stage build for React frontend

# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set production environment variables
ENV NODE_ENV=production
ENV VITE_API_BASE_URL=/api
ENV VITE_APP_NAME=MyRotaPro
ENV VITE_APP_VERSION=1.0.0
ENV VITE_ENVIRONMENT=production

# Build the application
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user (skip if nginx user already exists)
RUN addgroup -g 1001 -S nginxapp 2>/dev/null || true
RUN adduser -S nginxapp -u 1001 -G nginxapp 2>/dev/null || true

# Change ownership (nginx user already exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx
RUN chown -R nginx:nginx /var/log/nginx
RUN chown -R nginx:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user (use existing nginx user)
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

