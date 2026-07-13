import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean {
    const env = process.env.NODE_ENV || 'dev';
    if (env === 'dev' || env === 'development' || env === 'test') {
      return true;
    }

    throw new ForbiddenException(
      'Este endpoint solo está disponible en entorno de desarrollo',
    );
  }
}
