import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
  // CSP is disabled because Swagger UI at /docs loads inline scripts/styles
  // that the default CSP would block. The frontend is responsible for its
  // own CSP at the edge (CDN / nginx).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Comma-separated whitelist of allowed origins. Joi already validated
  // that FRONTEND_URL exists and does not contain a wildcard.
  const allowedOrigins = configService
    .get<string>('FRONTEND_URL', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Same-origin / server-to-server requests (curl, health checks)
      // arrive without an Origin header. They are not subject to CORS
      // and must be allowed through.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked: origin '${origin}' not allowed`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
    .setTitle('Tu Super API')
    .setDescription('Tu Super e-commerce API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number.parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
