# Заметки по безопасности NexusRM

Реализованные меры:

- хеширование паролей через bcrypt;
- JWT access tokens и хешированные refresh tokens;
- role-based guards для прав `admin`, `manager`, `viewer`;
- DTO validation через class-validator и whitelist mode;
- security headers через Helmet;
- CORS ограничивается переменной `CORS_ORIGIN`;
- rate limiting через Nest guard;
- слой Prisma снижает риск SQL injection;
- API key authentication для публичных integration endpoints;
- audit logs для чувствительных изменений;
- `.env` исключен из Git, а `.env.example` содержит только placeholder-секреты.

Памятка для production:

- заменить демо-пароли перед публичной эксплуатацией;
- заменить демо API key;
- держать backend за HTTPS и reverse proxy;
- ограничить публичные API-ключи по владельцу, scope и политике ротации.
