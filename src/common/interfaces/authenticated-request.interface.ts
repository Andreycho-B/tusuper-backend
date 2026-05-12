import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
}

import { Role } from '../../roles/entities/role.entity';

export interface AuthenticatedUser {
  userId: number;
  role: string[];
  roles: Role[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
