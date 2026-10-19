import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import type { ConfigType } from '@nestjs/config';
import config from '../../config';
import { GoogleUser } from '../interfaces/google-user.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(config.KEY) configService: ConfigType<typeof config>) {
    super({
      clientID: configService.google.clientId!,
      clientSecret: configService.google.clientSecret!,
      callbackURL: configService.google.callbackUrl!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { name, emails, photos, id } = profile;
    const rawVerified =
      emails && emails.length > 0 ? (emails[0] as any).verified : undefined;
    const jsonVerified = (profile as any)._json?.email_verified;
    const emailVerified =
      rawVerified === true ||
      rawVerified === 'true' ||
      jsonVerified === true ||
      jsonVerified === 'true' ||
      false;

    const email =
      emails && emails.length > 0
        ? emails[0].value
        : ((profile as any)._json?.email ?? '');

    const user: GoogleUser = {
      googleId: id,
      email,
      emailVerified,
      firstName: name?.givenName || 'Google',
      lastName: name?.familyName || 'User',
      picture: photos && photos.length > 0 ? photos[0].value : null,
    };
    done(null, user);
  }
}
