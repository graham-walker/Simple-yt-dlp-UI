#!/bin/bash

# Execute within the directory of the script
cd "$(dirname "$0")"

# Create the logs directory
mkdir -p ./logs

# Check if yt-dlp is installed
if ! which yt-dlp > /dev/null; then 
    echo "yt-dlp must be installed to download videos"
    exit 1
fi

# Run yt-dlp and log the output
script -q /dev/null -c "yt-dlp --config-locations config.txt -a urls.txt 2>&1" | tee ./logs/log_$(date -u +%Y-%m-%d_%H-%M-%S).txt

# Check if Node.js is installed
if ! which node > /dev/null; then 
    echo "Install Node.js >=20 to generate play.html"
    exit 1
fi

# Check if Node.js version is sufficient
NODE_VERSION=$(node -v)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -c2-)

if [ "$MAJOR_VERSION" -ge 20 ]; then
    node generate.js
else
    echo "Install Node.js >=20 to generate play.html"
fi
