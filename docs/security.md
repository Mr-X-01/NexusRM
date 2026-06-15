# NexusRM Security Notes

Implemented controls:

- bcrypt password hashing
- JWT access tokens and hashed refresh tokens
- role-based guards for admin/manager/viewer permissions
- class-validator DTO validation and whitelist mode
- Helmet security headers
- CORS restricted through `CORS_ORIGIN`
- rate limiting through Nest throttler
- Prisma query layer for SQL injection resistance
- API key authentication for public integration endpoints
- audit logs for sensitive mutations
- `.env` excluded from Git; `.env.example` contains only placeholder secrets

Deployment reminders:

- Rotate all JWT secrets before public deployment.
- Replace demo passwords and demo API key.
- Put the backend behind HTTPS and a reverse proxy.
- Restrict public API keys by owner, scope and rotation policy before production use.
