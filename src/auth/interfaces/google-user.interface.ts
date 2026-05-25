import type { Request } from 'express';

/**
 * Shape of the user object produced by GoogleStrategy.validate()
 * and attached to `req.user` after a successful Google OAuth2 flow.
 */
export interface GoogleUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
  accessToken: string;
}

/**
 * Express request with the GoogleUser attached by Passport after
 * a successful Google OAuth2 authentication.
 */
export interface GoogleAuthRequest extends Request {
  user: GoogleUser;
}
