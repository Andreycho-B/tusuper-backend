import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users/users.service';

function cookieExtractor(req: Request): string | null {
  if (req && req.cookies && req.cookies['token']) {
    return req.cookies['token'];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required but not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (payload.jti) {
      const blacklisted = await this.authService.isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const user = await this.usersService.findOne(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    return {
      userId: payload.sub,
      role: payload.roles,
      roles: user.roles,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
