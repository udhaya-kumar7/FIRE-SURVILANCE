FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/datasets uploads/detections

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
