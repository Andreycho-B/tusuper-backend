import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../../dtos/user.dto';
import { RolesService } from '../../../roles/services/roles.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: ['roles'] });
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

  async remove(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Usuario #${userId} no encontrado`);
    }

    user.isActive = false;

    return this.userRepo.save(user);
  }
}
