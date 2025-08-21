#!/bin/bash

# running in docker
if [ -f /.dockerenv ]; then
    IP="0.0.0.0"  # bind to all 
else
    IP=$(grep FLASK_RUN_HOST server/.env | cut -d '=' -f 2-)
fi
PORT=$(grep FLASK_RUN_PORT server/.env | cut -d '=' -f 2-)

# Function to build the client
build_client() {
    echo "Building the client..."
    cd client
    npm run build
}

# Function to run the production server
run_prod() {
    echo "Starting the production server..."
    cd server
    gunicorn --bind="$IP:$PORT" --worker-class eventlet -w 1 app:app
}

# Build the client
build_client

# bring to root
cd ../

# Run the production server
run_prod