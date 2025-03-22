#!/bin/bash

DB_USERNAME="${1:-postgres}"
DB_PASSWORD="${2:-postgres}"
DB_HOST="${3:-127.0.0.1}"
DB_PORT="${4:-5432}"
DB_NAME="${5:-myDB}"

POSTGRESQL_URI="postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

#change directory
cd ..
PWD=$(pwd)
CONFIG_DIR="test"
BUILD_DIR="$PWD/build/index.js"
echo "Current directory is $CONFIG_DIR"

echo  '{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "'$BUILD_DIR'",
        "'$POSTGRESQL_URI'"
      ]
    }
  }
}
'> config.json

mv config.json $CONFIG_DIR/config.json