# Step 1: Build Stage (compile TS -> JS)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Production Stage (run compiled JS)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies (excludes dev dependencies like typescript compilation tools)
RUN npm install --only=production
COPY --from=builder /app/dist ./dist

# Open port 5000 for backend HTTP traffic
EXPOSE 5000

CMD ["node", "dist/server.js"]
