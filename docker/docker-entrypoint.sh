#!/bin/sh

# Create default providers.json if necessary
if [ ! -f /config/providers.json ]; then
  echo "[]" > /config/providers.json
fi

pm2-runtime server.js
