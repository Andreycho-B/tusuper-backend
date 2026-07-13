import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users/users.service';

interface CacheEntry {
  active: boolean;
  roles: any[];
  expiresAt: number;
}

function cookieExtractor(req: Request): string | null {
  if (req && req.cookies && req.cookies['token']) {
    return req.cookies['token'];
  }
  return null;
}

const USER_CACHE_TTL_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userCache = new Map<number, CacheEntry>();

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    const rsaPublicKey = configService.get<string>('RSA_PUBLIC_KEY');
    const secret = rsaPublicKey
      ? Buffer.from(rsaPublicKey, 'base64').toString('utf-8')
      : configService.get<string>('JWT_SECRET');
    const algorithms: string[] = rsaPublicKey ? ['RS256'] : ['HS256'];

    if (!secret) {
      throw new Error('JWT_SECRET or RSA_PUBLIC_KEY is required but not set');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: algorithms as any,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (payload.jti) {
      const blacklisted = await this.authService.isTokenBlacklisted(
        payload.jti,
      );
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    const now = Date.now();
    const cached = this.userCache.get(payload.sub);
    if (cached && cached.expiresAt > now) {
      if (!cached.active) {
        throw new UnauthorizedException('User account is inactive or deleted');
      }
      return {
        userId: payload.sub,
        role: payload.roles,
        roles: cached.roles,
        jti: payload.jti,
        exp: payload.exp,
        cnf: payload.cnf,
      };
    }

    const user = await this.usersService.findOne(payload.sub);

    const active = !!(user && user.isActive);
    this.userCache.set(payload.sub, {
      active,
      roles: user?.roles || [],
      expiresAt: now + USER_CACHE_TTL_MS,
    });

    if (!active) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    return {
      userId: payload.sub,
      role: payload.roles,
      roles: user.roles,
      jti: payload.jti,
      exp: payload.exp,
      cnf: payload.cnf,
    };
  }
}
