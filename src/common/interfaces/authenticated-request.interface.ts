import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
}

export interface AuthenticatedUser {
  userId: number;
  role: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
