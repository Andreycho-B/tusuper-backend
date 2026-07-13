import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  private hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
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
      throw new BadRequestException('El token es invalido o ha expirado');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await this.userRepo.save(user);

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
