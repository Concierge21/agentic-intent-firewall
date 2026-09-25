# Use a lightweight Node.js Alpine image for a smaller footprint
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to cache dependencies
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy all remaining source code and frontend files into the container
COPY . .

# Compile the TypeScript files into JavaScript
RUN npx tsc

# Expose port 3000 to the outside world
EXPOSE 3000

# Start the Express server
CMD ["node", "src/index.js"]