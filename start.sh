#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Word Spelling App...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
fi

# Check if words directory exists
if [ ! -d "words" ]; then
    echo -e "${BLUE}Creating words directory...${NC}"
    mkdir -p words
fi

# Start the application
echo -e "${GREEN}Launching server and frontend...${NC}"
echo -e "${GREEN}Server will run on port 3003${NC}"
echo -e "${GREEN}Frontend will run on port 5173${NC}"

npm run dev
