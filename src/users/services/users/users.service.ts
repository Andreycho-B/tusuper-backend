import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  UpdatePasswordDto,
} from '../../dtos/user.dto';
import { RolesService } from '../../../roles/services/roles.service';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly rolesService: RolesService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<User>> {
    const { limit = 10, offset = 0, search } = pagination;

    // Complejidad Temporal: O(N) para serialización de registros devueltos. Búsqueda delegada a la DB.
    // Complejidad Espacial: O(N) para los registros devueltos.
    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    if (search) {
      queryBuilder.where(
        'user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { data, total, limit, offset };
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.modules', 'module')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }

    return user;
  }

  async findOne(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { roles: { modules: true } },
    });

    if (!user) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { roleIds, password, ...userData } = createUserDto;

    const existingUser = await this.userRepo.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Ya existe un usuario con el email ${userData.email}`,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const roles = await this.rolesService.findByIds(roleIds);

    if (roles.length !== roleIds.length) {
      throw new NotFoundException('Algunos roles no fueron encontrados');
    }

    const newUser = this.userRepo.create({
      ...userData,
      password: hashedPassword,
      roles,
    });

    return this.userRepo.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { roleIds, password, ...userData } = updateUserDto;

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario #${id} no encontrado`);
    }

    if (userData.email) {
      const existingUser = await this.userRepo.findOne({
        where: { email: userData.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          `Ya existe un usuario con el email ${userData.email}`,
        );
      }
    }

    if (roleIds) {
      const roles = await this.rolesService.findByIds(roleIds);

      if (roles.length !== roleIds.length) {
        throw new NotFoundException('Algunos roles no fueron encontrados');
      }

      user.roles = roles;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    this.userRepo.merge(user, userData);

    return this.userRepo.save(user);
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findOne(userId);
    this.userRepo.merge(user, updateProfileDto);
    return this.userRepo.save(user);
  }

  async updatePassword(
    userId: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const { currentPassword, newPassword } = updatePasswordDto;

    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    if (!user.password) {
      throw new ConflictException(
        'Usuario OAuth no tiene contraseña establecida. Use login social.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new ConflictException('La contraseña actual es incorrecta');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async remove(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    user.isActive = false;

    return this.userRepo.save(user);
  }

  async updateAvatar(userId: number, avatarUrl: string): Promise<User> {
    const user = await this.findOne(userId);
    user.avatarUrl = avatarUrl;
    return this.userRepo.save(user);
  }

  async removeAvatar(userId: number): Promise<User> {
    const user = await this.findOne(userId);
    user.avatarUrl = null;
    return this.userRepo.save(user);
  }

  async deleteMyAccount(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    // Eliminar subscripciones push del usuario
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from('push_subscriptions')
      .where('userId = :userId', { userId })
      .execute();

    // Anonimizar datos personales y desactivar cuenta
    user.firstName = 'Usuario';
    user.lastName = 'Eliminado';
    user.email = `deleted_${userId}_${Date.now()}@tusuper.com`;
    user.password = null;
    user.displayName = null;
    user.avatarUrl = null;
    user.googleId = undefined;
    user.isEmailVerified = false;
    user.isActive = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.userRepo.save(user);
  }
}
