# Use base node 18.19.1 image from Docker hub
FROM node:18.19.1-alpine

# Update Alpine packages and install specific versions
RUN apk update && \
    apk upgrade && \
    apk add --no-cache busybox openssl

# Set the working directory
WORKDIR /food-backend-msq

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install additional dependencies
RUN npm install --save cors

# Copy the rest of the application source code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the main application
CMD ["node", "app.js"]
