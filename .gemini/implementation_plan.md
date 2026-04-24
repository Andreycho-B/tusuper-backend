# Auditoría Técnica y Plan de Remediación: TuSuper Backend (NEO)

Se ha completado la auditoría rigurosa del proyecto, evaluando la arquitectura, seguridad, rendimiento y adherencia a buenas prácticas. A continuación, se presenta el informe detallado y el plan de acción para resolver las deudas técnicas identificadas.

## ⚠️ User Review Required (Hallazgos Críticos)

> [!CAUTION]
> **Vulnerabilidad de Deadlock (Condición de Carrera Crítica)**
> En `orders.service.ts` (métodos `create` y `remove`), se realizan bloqueos pesimistas (`pessimistic_write`) dentro de un bucle sobre los `items` del pedido. Al no ordenar previamente los `productId`, dos transacciones simultáneas que adquieran bloqueos sobre los mismos productos en orden inverso causarán un **Deadlock** en PostgreSQL.

> [!WARNING]
> **Cuello de Botella de Rendimiento $O(N)$ en Transacciones**
> En `orders.service.ts`, se ejecutan llamadas a base de datos (`getOne` y `update`) iterativamente para cada ítem de la orden. Esto genera una complejidad espacial $O(1)$ pero temporal de red inaceptable (N viajes a DB). Debe reemplazarse por consultas Bulk $O(1)$ usando la cláusula `IN (...)` e inserciones masivas.

> [!IMPORTANT]
> **Brechas de Seguridad Identificadas**
> - **Credenciales Hardcoded (SonarQube: yaml:S2068)**: Se exponen contraseñas (`root`/`123456`) en `docker-compose.yml`.
> - **CORS Inseguro**: Configuración estática en `main.ts` susceptible a suplantaciones.
> - **Fuga de Excepciones**: El bloque `catch (error: unknown)` en el servicio de órdenes devuelve directamente la excepción sin sanitización ni registro log contextual, pudiendo exponer estructuras de DB.

## Open Questions

> [!NOTE]
> **Aclaraciones Técnicas Requeridas**
> 1. **Gestión de Stock**: ¿Deseas que la validación masiva (Bulk) bloquee todos los productos de inmediato u optamos por una solución de reserva optimista temporal (Saga) para evitar locks prolongados?
> 2. **Refactorización a Prisma**: Los reportes de SonarQube indicaban Prisma, pero el código actual implementa TypeORM nativo. ¿Proseguimos la refactorización estrictamente bajo TypeORM?

## Proposed Changes (Plan de Remediación)

---

### Módulo: Orders (`src/orders`)

#### [MODIFY] [orders.service.ts](file:///c:/tusuper-backend/src/orders/orders.service.ts)
- **Rendimiento y Deadlocks**: 
  - Ordenar los arreglos de productos (`items.sort((a, b) => a.productId - b.productId)`) antes de solicitar el Lock $O(N \log N)$.
  - Cambiar validaciones unitarias por una consulta Bulk: `where('id IN (:...ids)')`.
  - Migrar actualización iterativa a query masiva (`CASE WHEN`).
- **Seguridad**: Implementar un bloque `try/catch` con `Logger` nativo de NestJS y envolver los errores de PG en excepciones HTTP manejadas.

### Módulo: Core (`src`)

#### [MODIFY] [main.ts](file:///c:/tusuper-backend/src/main.ts)
- Restringir la política CORS mediante expresiones regulares validadas desde variables de entorno.
- Instalar e integrar `helmet` para proveer defensa en profundidad mediante headers HTTP seguros.

### Módulo: Infraestructura

#### [MODIFY] [docker-compose.yml](file:///c:/tusuper-backend/docker-compose.yml)
- Eliminar contraseñas estáticas, reemplazándolas por inyección de variables de entorno (ej. `${POSTGRES_PASSWORD}`).

## Verification Plan

### Automated Tests
- Validaremos el flujo completo con Postman, asegurando las respuestas 201 y 400.
- Ejecutaremos pruebas de carga local (usando `stress-test.js` o `k6`) para someter `orders.service.ts` a condiciones de concurrencia y validar que no se disparen deadlocks de base de datos.
- Reanálisis final con SonarQube para confirmar 0 Code Smells/Vulnerabilities.
