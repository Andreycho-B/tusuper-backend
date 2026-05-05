import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users/users.service';
import * as bcrypt from 'bcrypt';
import { UserModel } from '../../users/interfaces/user';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _discarded, ...result } = user;
    return result;
  }

  login(user: UserModel) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role: Role) => role.name) || [],
    };

    return {
      access_token: this.getJwtToken(payload),
      user: user,
    };
  }

  checkAuthStatus(user: User): {
    user: Omit<User, 'password'>;
    access_token: string;
  } {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _excluded, ...userProfile } = user;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role: Role) => role.name) || [],
    };

    return {
      user: userProfile as Omit<User, 'password'>,
      access_token: this.getJwtToken(payload),
    };
  }

  private getJwtToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
