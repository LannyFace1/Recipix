# 🥘 Crouton — Self-Hosted Recipe Organizer & Meal Planner

A beautiful, self-hosted recipe organizer and weekly meal planner inspired by the Crouton iOS app. All your data stays on your server.

## ✨ Features

| Feature | Status |
|---|---|
| Recipe library with photos | ✅ |
| Import recipes from any URL | ✅ |
| Recipe scaling (adjust servings) | ✅ |
| Metric ↔ Imperial conversion | ✅ |
| Per-step countdown timers | ✅ |
| Weekly meal planner | ✅ |
| Shopping list (manual + auto from meal plan) | ✅ |
| Favorites & tag system | ✅ |
| Search & filter | ✅ |
| Dark mode | ✅ |
| AI meal plan generation (Claude API) | ⚙️ Optional |
| Multi-user (each user has own recipes) | ✅ |

## 🚀 Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/LannyFace1/RecipeApp.git
cd crouton-selfhosted
cp .env.example .env
```

Edit `.env`:
```env
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
HOST_PORT=8080

# Optional: enable AI meal planning
CLAUDE_API_KEY=sk-ant-...
```

### 2. Start

```bash
docker compose up -d
```

Open: **http://localhost:8080**

Register an account and start adding recipes!

### 3. Stop / Update

```bash
docker compose down          # stop
docker compose pull && docker compose up -d  # update
```

## 🤖 AI Meal Planning (Optional)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`: `CLAUDE_API_KEY=sk-ant-api03-...`
3. Restart: `docker compose restart backend`

In the Meal Planner, the "AI Generate" button will now be unlocked. Claude will automatically pick recipes from your library to fill the week with varied, balanced meals.

## 🔐 Security

```
✅ SQL Injection:    Parameterized queries (pg)
✅ XSS:             Helmet CSP headers + React escaping
✅ CSRF:            Stateless JWT (no cookies)
✅ Auth:            JWT (15m access) + refresh tokens (30d)
✅ Secrets:         Via .env / Docker env vars, never hardcoded
✅ Ports:           Only Nginx (8080) exposed externally
✅ Input Validation: Zod schemas on all endpoints
✅ Rate Limiting:   express-rate-limit (100 req/15min)
✅ Docker:          Alpine images, non-root user
```

## 📁 Architecture

```
crouton-selfhosted/
├── docker-compose.yml
├── .env.example
├── nginx/nginx.conf          # Reverse proxy
├── backend/                  # Node.js + Express API
│   └── src/
│       ├── routes/           # REST endpoints
│       ├── services/         # Recipe importer, AI planner
│       └── db/               # PostgreSQL + migrations
└── frontend/                 # React + Tailwind SPA
    └── src/
        ├── pages/            # Main views
        ├── components/       # Reusable UI
        ├── context/          # Auth, Theme
        └── api/              # API client
```

**Backend → Frontend** communicates via REST API. Nginx routes `/api/*` → backend, `/*` → frontend SPA. PostgreSQL stores all data in named volumes (persisted across restarts).

## 💡 Tips

- **Backup your data:** `docker compose exec postgres pg_dump -U crouton crouton > backup.sql`
- **HTTPS:** Put Nginx behind Traefik or Caddy with Let's Encrypt for SSL
- **Reverse proxy:** The app works behind any reverse proxy that forwards `X-Forwarded-For`
