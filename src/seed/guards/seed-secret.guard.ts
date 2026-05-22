import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SeedSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.SEED_SECRET;
    if (!expected) {
      throw new ForbiddenException(
        'SEED_SECRET no está configurado en el servidor',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-seed-secret');

    if (!provided || provided !== expected) {
      throw new ForbiddenException('Token de seed inválido');
    }

    return true;
  }
}
