# OpenClaw Integration for MEP Projects

## Quick Setup

### 1. Generate API Key
```bash
npx tsx openclaw/generate-api-key.ts
```

### 2. Add to Environment Variables
Add to `.env.local` and Vercel:
```
AI_API_KEY=mep_ai_xxxxxxxxxx
```

### 3. Install OpenClaw
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

### 4. Configure OpenClaw
Copy the skills folder to your OpenClaw workspace:
```powershell
Copy-Item -Recurse openclaw/skills/mep-projects ~/.openclaw/skills/mep-projects
```

Set environment variables in OpenClaw config:
```
MEP_API_URL=https://your-app.vercel.app
MEP_API_KEY=mep_ai_xxxxxxxxxx
```

### 5. Connect a Chat Channel
Follow OpenClaw docs to connect WhatsApp, Telegram, or Slack.

## Testing the API

### Test query (PowerShell):
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_API_KEY"
    "X-User-Email" = "enrique.gallego@mep-projects.com"
    "Content-Type" = "application/json"
}

# Dashboard summary
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/ai-query" `
    -Method POST -Headers $headers `
    -Body '{"action":"dashboard-summary"}'

# Search projects
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/ai-query" `
    -Method POST -Headers $headers `
    -Body '{"action":"search-projects","params":{"query":"Lantania"}}'

# Log hours
Invoke-RestMethod -Uri "https://your-app.vercel.app/api/ai-actions" `
    -Method POST -Headers $headers `
    -Body '{"action":"log-hours","params":{"projectCode":"P-26-401","hours":4,"notes":"Revisión planos"}}'
```

## Directory Structure
```
openclaw/
├── README.md              # This file
├── generate-api-key.ts    # API key generator
└── skills/
    └── mep-projects/
        └── SKILL.md       # Main skill definition
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai-query` | POST | Read-only data queries |
| `/api/ai-actions` | POST | Write operations |

## Security

- API Key required in `Authorization: Bearer <key>` header
- User identified by `X-User-Email` header
- RBAC enforced per user role (WORKER/ADMIN/SUPERADMIN)
- All queries scoped to user's company
