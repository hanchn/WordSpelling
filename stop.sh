#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}Stopping Word Spelling App...${NC}"

# Kill process on port 3003 (Server)
SERVER_PID=$(lsof -t -i:3003)
if [ -n "$SERVER_PID" ]; then
    echo "Killing Server on port 3003 (PID: $SERVER_PID)"
    kill -9 $SERVER_PID
else
    echo "No server running on port 3003"
fi

# Kill process on port 5173 (Frontend)
FRONTEND_PID=$(lsof -t -i:5173)
if [ -n "$FRONTEND_PID" ]; then
    echo "Killing Frontend on port 5173 (PID: $FRONTEND_PID)"
    kill -9 $FRONTEND_PID
else
    echo "No frontend running on port 5173"
fi

echo -e "${GREEN}App stopped successfully.${NC}"
