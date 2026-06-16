import { Request } from 'express';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Role } from '../../roles/entities/role.entity';

export interface AuthenticatedUser {
  userId: number;
  role: string[];
  roles: Role[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
