#!/bin/sh
set -e

echo "[ollama] Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for server to be ready
echo "[ollama] Waiting for server..."
sleep 5

# Pull the model if specified
if [ -n "$OLLAMA_MODEL" ]; then
    echo "[ollama] Pulling model: $OLLAMA_MODEL"
    ollama pull "$OLLAMA_MODEL"
fi

echo "[ollama] Keeping Ollama running..."
wait $OLLAMA_PID
