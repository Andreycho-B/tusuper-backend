import { Module } from '@nestjs/common';
import { AuthService } from '../auth/services/auth.service';
import { PasswordResetService } from '../auth/services/password-reset.service';
import { AuthController } from '../auth/controllers/auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigType } from '@nestjs/config';
import config from '../config';
import { ModulesGuard } from './guards/modules.guard';
import { JwtAuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, TokenBlacklist]),
    UsersModule,
    MailModule,
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [config.KEY],
      useFactory: (configType: ConfigType<typeof config>) => ({
        secret: configType.jwt.secret,
        signOptions: {
          expiresIn: configType.jwt.expiresIn,
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    PasswordResetService,
    ModulesGuard,
    RolesGuard,
    JwtAuthGuard,
    JwtStrategy,
    GoogleStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, ModulesGuard, RolesGuard, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
