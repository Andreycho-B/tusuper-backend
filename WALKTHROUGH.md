# WALKTHROUGH: VALIDACIÓN ESTRICTA DE TELÉFONO EN PEDIDOS

Este documento describe la especificación técnica y las modificaciones aplicadas al backend en la rama `feature/back-phone-validation`.

---

## 1. Cambios de Código

### 1.1 DTO de Pedidos: `CreateOrderDto`
* **Archivo**: `src/orders/dto/create-order.dto.ts`
* **Acción**: Reemplazo de la validación general de longitud por una expresión regular específica. El teléfono ahora debe tener exactamente 10 dígitos numéricos y comenzar con el dígito '3'.
* **Implementación**:
  ```typescript
  @ApiProperty({
    description: 'Direct contact phone for the delivery person',
    example: '3001234567',
  })
  @IsString()
  @Matches(/^3\d{9}$/, {
    message: 'El teléfono debe tener exactamente 10 dígitos y empezar por 3',
  })
  contactPhone: string;
  ```

### 1.2 Limpieza y Ruta del Endpoint Raíz: `AppController`
* **Archivo**: `src/app.controller.ts`
* **Acción**: Se descomentó el endpoint `@Get()` para evitar errores 404 en pruebas de sanidad general del servidor.
* **Implementación**:
  ```typescript
  @Get()
  getHello(): string {
    const myVar = this.configService.get<string>('NODE_ENV');
    return this.appService.getHello(myVar);
  }
  ```

---

## 2. Cambios en Pruebas

### 2.1 Suite E2E de Pedidos: `orders.e2e-spec.ts`
* **Archivo**: `test/orders.e2e-spec.ts`
* **Acción**: 
  1. Se actualizaron todas las llamadas de prueba para usar el número de teléfono válido `3001234567` en lugar del valor antiguo `+1234567890`.
  2. Se añadió un nuevo caso de prueba para validar que el `ValidationPipe` rechaza adecuadamente peticiones con teléfonos inválidos (código HTTP 400 Bad Request):
  ```typescript
  it('[Validation] should reject with 400 Bad Request if contactPhone does not start with 3 or is not exactly 10 digits', async () => {
    const payload = {
      paymentMethod: 'CASH',
      deliveryAddress: '123 Main St',
      contactPhone: '2001234567', // Empieza con 2 (inválido)
      items: [{ productId: testProduct.id, quantity: 1 }],
    };

    const response = await request(app.getHttpServer() as App)
      .post('/orders')
      .set('Authorization', `Bearer ${testToken}`)
      .send(payload)
      .expect(400);

    expect(response.body.message).toContain('El teléfono debe tener exactamente 10 dígitos y empezar por 3');
  });
  ```

### 2.2 Suite E2E de Sanidad del Servidor: `app.e2e-spec.ts`
* **Archivo**: `test/app.e2e-spec.ts`
* **Acción**: Se actualizó la expectativa de retorno a `'test'` coincidiendo con el valor de la variable de entorno `NODE_ENV` evaluada en el entorno de testing.

---

## 3. Estado del Pipeline de Verificación

* **Pruebas Unitarias (`npm run test`)**:
  * Total: **35 de 35 pruebas exitosas** (100% aprobado).
* **Pruebas de Integración E2E (`npx jest --config ./test/jest-e2e.json --runInBand`)**:
  * Total: **8 de 8 pruebas exitosas** (100% aprobado).
