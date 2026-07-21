# Step 1: Build Stage (compile React -> HTML/JS/CSS)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Production Stage (serve assets using Nginx)
FROM nginx:alpine
# Copy custom Nginx configuration for React Router / SPA support
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy compiled static HTML/CSS/JS files to Nginx's public html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port 80 for web browsers
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
