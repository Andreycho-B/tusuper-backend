import { Module } from '@nestjs/common';

import { UsersController } from './controllers/users/users.controller';

import { ProfileController } from './controllers/profile/profile.controller';

import { UsersService } from './services/users/users.service';

import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';

import { RolesModule } from '../roles/roles.module';

import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RolesModule, CloudinaryModule],

  controllers: [UsersController, ProfileController],

  providers: [UsersService],

  exports: [UsersService],
})
export class UsersModule {}
