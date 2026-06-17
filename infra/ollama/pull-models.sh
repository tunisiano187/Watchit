#!/bin/sh
set -e

ollama serve &
SERVER_PID=$!

until ollama list >/dev/null 2>&1; do
  sleep 1
done

ollama pull "${OLLAMA_MODEL:-mistral:7b}"

wait "$SERVER_PID"
