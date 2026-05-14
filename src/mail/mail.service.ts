import { Injectable } from '@nestjs/common';
// @ts-ignore
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordResetEmail(email: string, token: string, userName: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Restablecer contraseña - TuSuper',
      template: './reset-password', // archivo .hbs
      context: {
        name: userName,
        resetUrl,
      },
    });
  }
}
