import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users/users.service';
import * as bcrypt from 'bcrypt';
import { UserModel } from '../../users/interfaces/user';
import { Role } from '../../roles/entities/role.entity';
import { RegisterDto } from '../dtos/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MailService } from '../../mail/mail.service';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { GoogleAuthRequest } from '../interfaces/google-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async validateUser(email: string, password: string) {
    let user: User | null = null;
    try {
      user = await this.usersService.findByEmail(email);
    } catch (error: unknown) {
      this.logger.error(
        'validateUser failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException('Invalid credentials');
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
      throw new ConflictException('El email ya está registrado');
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

  login(user: UserModel) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((role: Role) => role.name) || [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      return {
        message:
          'Si el correo electrónico existe, recibirás instrucciones para restablecer tu contraseña.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = this.hashResetToken(resetToken);

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await this.userRepo.save(user);

    void this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.firstName || 'Usuario',
    );

    return {
      message:
        'Si el correo electrónico existe, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async validateResetToken(token: string) {
    const hash = this.hashResetToken(token);

    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: hash },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return { valid: false };
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hash = this.hashResetToken(dto.token);

    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: hash },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('El token es inválido o ha expirado');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepo.save(user);

    return { message: 'Contraseña actualizada exitosamente' };
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
