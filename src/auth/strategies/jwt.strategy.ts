import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

import { UsersService } from '../../users/services/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      algorithms: ['HS512'],
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);

    // Reject tokens belonging to deactivated users. Without this check, a
    // user that an admin disabled (DELETE /users/:id sets isActive=false)
    // could keep using their existing JWT until it expires (up to 1h).
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return { userId: payload.sub, role: payload.roles, roles: user.roles };
  }
}
