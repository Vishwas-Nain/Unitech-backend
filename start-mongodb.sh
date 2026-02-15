#!/bin/bash

# Start MongoDB script
echo "Starting MongoDB..."

# Create data directory if it doesn't exist
mkdir -p ~/data/db

# Start MongoDB daemon
~/mongodb/bin/mongod --dbpath ~/data/db --fork --logpath ~/mongodb/mongod.log

# Check if MongoDB started successfully
if [ $? -eq 0 ]; then
    echo "✅ MongoDB started successfully"
    echo "📊 Data directory: ~/data/db"
    echo "📝 Log file: ~/mongodb/mongod.log"
else
    echo "❌ Failed to start MongoDB"
    exit 1
fi
