# Use official Node.js LTS image
FROM node:18-alpine

# Set build-time argument for environment
ARG BUILD_ENV=production

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire backend code
COPY . .

# Copy the GCP Key folder
COPY key /app/key

# Set environment variable for Google Cloud authentication
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/key/service-account.json"

# Copy the correct .env file based on the environment
COPY .env.$BUILD_ENV .env

# Expose the port the backend runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
