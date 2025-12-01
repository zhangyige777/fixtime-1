# FixTime AI Backend API

Serverless backend for FixTime AI CMMS built on Cloudflare Workers with Hono.js framework.

## Features

- **Serverless Architecture**: Runs on Cloudflare Edge for global performance
- **Smart Templates**: Pre-built maintenance checklists for common equipment
- **Multi-tenant Isolation**: Secure data separation using user_id
- **Asset Management**: Complete equipment tracking with health scores
- **Work Order System**: Task management with checklists
- **Plan Limits**: Enforces asset limits based on user plans (3 for free users)
- **JWT Authentication**: Secure authentication using Clerk

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Clerk JWT verification
- **Language**: JavaScript (ES Modules)

## Quick Start

### Prerequisites

1. Install Node.js (v18+)
2. Install Wrangler CLI: `npm install -g wrangler`
3. Create Cloudflare account and login: `wrangler auth login`
4. Get Clerk API keys from your Clerk dashboard

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create D1 database:
   ```bash
   npm run d1:create
   ```
   Note the database ID and update `wrangler.toml`

4. Run database migrations (local):
   ```bash
   npm run d1:migrate:local
   ```

5. Set environment variables in Cloudflare dashboard:
   - `CLERK_JWKS_URL`: Your Clerk JWKS URL
   - Replace `YOUR-DATABASE-ID` in wrangler.toml

6. Run locally:
   ```bash
   npm run dev
   ```

7. Deploy to production:
   ```bash
   # Run production migrations first
   npm run d1:migrate:prod

   # Deploy the worker
   npm run deploy
   ```

## API Documentation

### Base URL
- Production: `https://fixtime-ai-api.your-subdomain.workers.dev`
- Local: `http://localhost:8787`

### Authentication
All API requests (except templates) require Clerk JWT token:

```
Authorization: Bearer <clerk-jwt-token>
```

### Endpoints

#### Templates (Public)

**Get Equipment Templates**
```http
GET /api/templates/equipment
```

**Get Checklists for Template**
```http
GET /api/templates/checklists/:templateId
```

**Generate Maintenance Schedule**
```http
POST /api/templates/generate-schedule
{
  "template_id": "tmpl-gen-001",
  "asset_name": "Backup Generator",
  "frequency_multiplier": 1
}
```

#### Authentication

**Get/Update User Profile**
```http
GET /api/auth/profile
PUT /api/auth/profile
{
  "company_name": "Acme Corp"
}
```

#### Assets

**Get Asset Limits**
```http
GET /api/assets/limits
```

**Get All Assets**
```http
GET /api/assets?page=1&limit=50
```

**Create Asset**
```http
POST /api/assets
{
  "name": "CNC Machine #1",
  "model": "DMG Mori 5000",
  "serial_number": "CM-001",
  "location": "Workshop A",
  "status": "Running",
  "health_score": 95,
  "template_id": "tmpl-cnc-001"
}
```

**Update Asset**
```http
PUT /api/assets/:id
```

**Delete Asset**
```http
DELETE /api/assets/:id
```

#### Work Orders

**Get Work Orders**
```http
GET /api/work-orders?status=Open&priority=Critical
```

**Create Work Order**
```http
POST /api/work-orders
{
  "title": "Emergency Repair",
  "description": "Machine making unusual noise",
  "asset_id": "asset-uuid",
  "priority": "Critical",
  "due_date": 1640995200,
  "tasks": [
    "Inspect bearings",
    "Check oil levels",
    "Test operation"
  ]
}
```

**Update Work Order Status**
```http
PATCH /api/work-orders/:id/status
{
  "status": "Completed"
}
```

#### Dashboard

**Get Dashboard Stats**
```http
GET /api/users/dashboard
```

## Smart Templates System

The system includes pre-configured maintenance templates for:

1. **Generator**
   - Daily visual inspection
   - Weekly fluid checks
   - Monthly oil changes
   - Annual professional service

2. **CNC Machine**
   - Daily cleaning
   - Weekly conveyor inspection
   - Monthly lubrication
   - Quarterly calibration

3. **Forklift**
   - Daily safety checks
   - Weekly tire inspection
   - Monthly greasing
   - Annual certification

4. **HVAC System**
5. **Air Compressor**
6. **Conveyor Belt**
7. **Hydraulic Press**
8. **Water Pump**

## Error Handling

API returns consistent error format:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE" // Optional
}
```

Common HTTP codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (Asset limit exceeded)
- `404` - Not Found
- `500` - Internal Server Error

## Security Features

- JWT token verification with Clerk
- User-based data isolation
- SQL injection prevention (parameterized queries)
- CORS configuration
- Rate limiting (Cloudflare built-in)

## Development Tips

1. Use `wrangler dev` for local development
2. Database changes require updating `schema.sql`
3. Test with Clerk's test JWT tokens
4. Check logs in Cloudflare dashboard for debugging

## Future Enhancements

- Email notifications (Cloudflare Workers + Resend)
- File uploads (Cloudflare R2)
- Advanced analytics
- Multi-language support
- Mobile push notifications

## Support

For issues and questions:
- Create an issue in the repository
- Check Cloudflare Workers documentation
- Review Hono.js docs for advanced patterns