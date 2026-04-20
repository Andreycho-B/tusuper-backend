import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
