import { Role } from '../../roles/entities/role.entity';

export interface UserModel {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  isActive: boolean;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}