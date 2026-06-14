import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserModel } from '../../users/interfaces/user';
import { Role } from '../../roles/entities/role.entity';
import { RegisterDto } from '../dtos/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { GoogleAuthRequest } from '../interfaces/google-user.interface';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly ACCESS_TTL = 900; // 15 minutos
  private readonly REFRESH_TTL = 7 * 24 * 60 * 60; // 7 dias

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(TokenBlacklist)
    private readonly blacklistRepo: Repository<TokenBlacklist>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async validateUser(email: string, password: string) {
    let user: User | null = null;
    try {
      user = await this.usersService.findByEmail(email);
    } catch (error: unknown) {
      const isHttpException =
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException;
      this.logger.error(
        'validateUser failed',
        error instanceof Error ? error.stack : String(error),
      );
      if (isHttpException) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw new InternalServerErrorException(
        'Authentication service temporarily unavailable',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked. Try again later.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepo.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException(
        'No se pudo completar el registro. Por favor, intentalo de nuevo.',
      );
    }

    const userRole = await this.roleRepo.findOne({
      where: { name: 'USER' },
    });

    if (!userRole) {
      throw new InternalServerErrorException(
        'Role USER no encontrado en la base de datos',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      roles: [userRole],
    });

    const savedUser = await this.userRepo.save(newUser);
    return this.login(savedUser as UserModel);
  }

  async login(user: UserModel) {
    const jti = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role: Role) => role.name) || [],
      jti,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: this.ACCESS_TTL });
    const refreshToken = await this.generateRefreshToken(user.id);

    return { access_token: accessToken, refresh_token: refreshToken, user };
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(48).toString('hex');
    const entity = this.refreshTokenRepo.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + this.REFRESH_TTL * 1000),
    });
    await this.refreshTokenRepo.save(entity);
    return token;
  }

  async refresh(refreshToken: string) {
    const entity = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
    });

    if (!entity || entity.expiresAt < new Date()) {
      if (entity) await this.refreshTokenRepo.delete({ id: entity.id });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotacion: eliminar el viejo y generar nuevo
    await this.refreshTokenRepo.delete({ id: entity.id });

    const user = await this.usersService.findOne(entity.userId);
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return this.login(user as UserModel);
  }

  async logout(jti: string, exp: number, refreshToken?: string): Promise<void> {
    if (jti) {
      await this.blacklistRepo.save({ jti, expiresAt: new Date(exp * 1000) });
    }
    if (refreshToken) {
      await this.refreshTokenRepo.delete({ token: refreshToken });
    }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const entry = await this.blacklistRepo.findOne({ where: { jti } });
      return !!entry;
    } catch {
      return false;
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.blacklistRepo
      .createQueryBuilder().delete().where('expiresAt < :now', { now: new Date() }).execute();
    await this.refreshTokenRepo
      .createQueryBuilder().delete().where('expiresAt < :now', { now: new Date() }).execute();
  }

  async checkStatus(userId: number) {
    const user = await this.usersService.findOne(userId);

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;

    return this.login(result as UserModel);
  }

  async googleLogin(req: GoogleAuthRequest) {
    if (!req.user) {
      throw new BadRequestException('No user from google');
    }

    const { email, firstName, lastName, picture, googleId, emailVerified } =
      req.user;

    if (!emailVerified) {
      throw new BadRequestException(
        'Google email not verified. Cannot link or create account.',
      );
    }

    let user = await this.userRepo.findOne({
      where: { email },
      relations: ['roles'],
    });

    if (user) {
      if (user.googleId && user.googleId !== googleId) {
        throw new BadRequestException(
          'Este email ya esta vinculado a una cuenta de Google diferente',
        );
      }
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
        if (!user.avatarUrl) user.avatarUrl = picture;
        await this.userRepo.save(user);
      }
    } else {
      const userRole = await this.roleRepo.findOne({ where: { name: 'USER' } });

      if (!userRole) {
        throw new InternalServerErrorException(
          'Role USER no encontrado - no se puede crear usuario OAuth',
        );
      }

      user = this.userRepo.create({
        email,
        firstName,
        lastName,
        googleId,
        avatarUrl: picture,
        displayName: `${firstName} ${lastName}`,
        isEmailVerified: true,
        password: null,
        roles: [userRole],
      });
      user = await this.userRepo.save(user);
    }

    return this.login(user as UserModel);
  }

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
