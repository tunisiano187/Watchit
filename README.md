# Watchit

A personalized tech-watch platform. Watchit fetches daily digests of 10 articles per topic, delivers them by email, and learns from your feedback (click, like, dislike) to improve future selections.

## Architecture

```
docker-compose.yml
apps/
  watchit/   — Next.js 14 web app + BullMQ worker
infra/
  searxng/   — SearXNG settings
  ollama/    — model pull script
```

Services: PostgreSQL 16, Redis 7, SearXNG, Vane (search API), Ollama (topic extraction), watchit (web), worker.

## Prerequisites

- Docker + Docker Compose v2
- A [Resend](https://resend.com) account (3 000 free emails/month)
- An Ollama-compatible model (default: `mistral:7b`); pulled automatically on first run

## Quick start

```bash
cp .env.example .env
# Fill in at minimum: NEXTAUTH_SECRET, RESEND_API_KEY, POSTGRES_PASSWORD
docker compose up
```

The web app is available at `http://localhost:3000`.

## Vane provider setup

Vane (the search engine) requires chat and embedding models to be configured via its admin UI before the digest worker can search. After `docker compose up`:

1. Open `http://localhost:3001` (Vane UI)
2. Go to **Settings → Models** and configure a chat model and an embedding model
3. Note the **Provider ID** and **Model Key** for each, then set them in `.env`:
   ```
   VANE_CHAT_PROVIDER_ID=...
   VANE_CHAT_MODEL_KEY=...
   VANE_EMBEDDING_PROVIDER_ID=...
   VANE_EMBEDDING_MODEL_KEY=...
   ```
4. Restart with `docker compose up`

## Database migrations

Run once (or on every schema change) before starting the app:

```bash
docker compose run --rm watchit pnpm db:migrate
```

## Environment variables

See `.env.example` for all required variables and documentation.

## UI languages

The interface ships in English (default) and French. To add a new language:

1. See `CONTRIBUTING_TRANSLATIONS.md` for instructions.

## Content language filtering

In Settings, you can choose which article languages you want to receive. Leaving it empty means all languages are included.

## Development

```bash
cd apps/watchit
pnpm install
pnpm dev          # Next.js dev server
pnpm worker:dev   # BullMQ worker (watch mode)
```
