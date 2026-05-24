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

## Reportar vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, reporta de manera privada:

- Email: jktusuper@gmail.com (asunto: `[SECURITY] descripción breve`)
- **No abras un issue público** hasta que el fix esté desplegado

## Auditorías

- **Última auditoría**: 2026-05-24 (`audit-reports/2026-05-24/security.md`)
- **Próxima auditoría programada**: tras completar Sprint 1 de remediación
