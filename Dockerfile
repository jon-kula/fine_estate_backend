FROM node:18-alpine

# Install dependencies for Sharp
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source files
RUN rm -rf src tsconfig.json

EXPOSE 3001

CMD ["node", "dist/index.js"]