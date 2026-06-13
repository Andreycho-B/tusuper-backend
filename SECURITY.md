# Security Policy — TuSuper Backend

## Rotación de secretos

### Cuándo rotar `JWT_SECRET`

Rotar **inmediatamente** si:

- Se sospecha que el secret fue expuesto (commit accidental, leak en logs, etc.)
- Un desarrollador con acceso al `.env` deja el equipo
- Después de una incidencia de seguridad
- En general: cada 90 días en producción, 180 días en staging

### Cómo rotar `JWT_SECRET`

1. Generar un nuevo valor aleatorio:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. Actualizar el secret en el gestor de secretos del entorno (Render, AWS Secrets Manager, etc.)
3. Reiniciar las instancias del backend
4. **Importante**: rotar el secret invalida **todas las sesiones activas**. Los usuarios deberán volver a iniciar sesión

> El esquema Joi de validación en `src/app.module.ts` exige `JWT_SECRET` de al menos 32 caracteres. Secrets más cortos rechazan el arranque del backend.

### Política para `.env*`

| Archivo | ¿Commiteado? | Notas |
|---|---|---|
| `.env` | ❌ NUNCA | local-only, ignorado por `.gitignore` |
| `.env.test` | ❌ NUNCA | local-only, ignorado por `.gitignore` |
| `.stg.env` | ❌ NUNCA | local-only |
| `.prod.env` | ❌ NUNCA | en producción usar gestor de secretos del proveedor |
| `.env.example` | ✅ sí | plantilla con placeholders |
| `.env.test.example` | ✅ sí | plantilla con placeholders |

## Limpieza del histórico git

> **Sólo si se confirmó que un secret real estuvo commiteado en git.**

Hasta el commit `a6dfb0f` el archivo `.env.test` estuvo commiteado con el valor `JWT_SECRET=Matrix`. Aunque ahora se removió del tracking, el secret sigue en el histórico y es público en GitHub.

Para purgar el histórico:

### Opción A — `git filter-repo` (recomendado)

```bash
# 1. Instalar git-filter-repo
pip install git-filter-repo

# 2. Clonar el repo en bare (NO trabajar sobre tu working copy)
git clone --bare git@github.com:Andreycho-B/tusuper-backend.git tusuper-backend.git
cd tusuper-backend.git

# 3. Eliminar .env.test de TODO el histórico
git filter-repo --path .env.test --invert-paths

# 4. Force-push (¡coordinar con el equipo!)
git push --force --all origin
git push --force --tags origin
```

### Opción B — BFG Repo-Cleaner

```bash
java -jar bfg.jar --delete-files .env.test tusuper-backend.git
cd tusuper-backend.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force --all origin
```

### Pasos posteriores obligatorios

1. **Avisar a todo el equipo** antes del force-push: cualquiera con un clone existente debe re-clonar el repo
2. **Invalidar PRs en curso** (force-push reescribe SHAs y rompe los diffs)
3. **Rotar el secret** (aunque se purgue del git, asumir que ya está comprometido)
4. **Auditar logs de acceso** al repo: si fue público, asumir que el secret fue obtenido por terceros

## Vulnerabilidades conocidas y aceptadas

Hay 3 vulnerabilidades **moderate** restantes después de `npm audit fix` que NO se resolvieron porque requieren un upgrade semver-major:

| Paquete | Severidad | CVE | Cadena |
|---|---|---|---|
| `uuid` <11.1.1 | moderate | GHSA-w5hq-g745-h8pq | uuid → preview-email → @nestjs-modules/mailer |
| `preview-email` * | moderate | (transitiva) | preview-email → @nestjs-modules/mailer |
| `@nestjs-modules/mailer` 1.x | moderate | (transitiva) | usado por `MailModule` |

### Por qué se aceptan temporalmente

1. La vulnerabilidad de `uuid` afecta solo a las versiones `v3/v5/v6` **cuando se pasa un buffer custom**. `preview-email` no usa esa API.
2. `preview-email` es una dependencia de desarrollo (preview de templates) que solo se activa en `NODE_ENV !== 'production'`.
3. El fix requiere `@nestjs-modules/mailer@2.x` (semver-major) — cambia la API de `MailerModule.forRoot()` y `MailerService.sendMail()`. Migración debe hacerse en PR aparte con tests del flujo de email (reset password).

### Plan de remediación

Crear PR `feature/sec-upgrade-mailer-major` en backlog:
- Upgrade `@nestjs-modules/mailer` a versión `^2.0.2` (o última estable)
- Verificar templates en `src/mail/templates/`
- Probar end-to-end: `/auth/forgot-password` → recepción del email → reset
- Re-correr `npm audit` para confirmar 0 vulns

## Reportar vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, reporta de manera privada:

- Email: jktusuper@gmail.com (asunto: `[SECURITY] descripción breve`)
- **No abras un issue público** hasta que el fix esté desplegado

## Auditorías

- **Última auditoría**: 2026-05-24 (`audit-reports/2026-05-24/security.md`)
- **Próxima auditoría programada**: tras completar Sprint 1 de remediación
