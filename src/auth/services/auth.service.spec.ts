import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../../users/services/users/users.service';
import { MailService } from '../../mail/mail.service';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { TokenBlacklist } from '../entities/token-blacklist.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HASHED_PASSWORD = bcrypt.hashSync('SecureP@ss1', 10);

const mockRole: Role = {
  id: 1,
  name: 'USER',
  description: 'Regular user',
  users: [],
  modules: [],
} as Role;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@test.com',
    password: HASHED_PASSWORD,
    isActive: true,
    roles: [mockRole],
    createdAt: new Date(),
    updatedAt: new Date(),
    avatarUrl: null,
    displayName: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    googleId: undefined,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    orders: [],
    ...overrides,
  } as User;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUsersService = {
  findByEmail: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-jwt-token'),
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockRoleRepo = {
  findOne: jest.fn(),
};

const mockBlacklistRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  }),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockJwtService.sign.mockReturnValue('signed-jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Role), useValue: mockRoleRepo },
        { provide: getRepositoryToken(TokenBlacklist), useValue: mockBlacklistRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // validateUser
  // -----------------------------------------------------------------------
  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const user = buildUser();
      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('juan@test.com', 'SecureP@ss1');

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('juan@test.com');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('noone@test.com', 'any'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const user = buildUser();
      mockUsersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.validateUser('juan@test.com', 'WrongPassword1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // -----------------------------------------------------------------------
  // register
  // -----------------------------------------------------------------------
  describe('register', () => {
    const registerDto = {
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@test.com',
      password: 'SecureP@ss1',
      confirmPassword: 'SecureP@ss1',
    };

    it('should register a new user and return access_token', async () => {
      mockUserRepo.findOne.mockResolvedValue(null); // no existing user
      mockRoleRepo.findOne.mockResolvedValue(mockRole);
      const saved = buildUser({ email: 'ana@test.com', firstName: 'Ana' });
      mockUserRepo.create.mockReturnValue(saved);
      mockUserRepo.save.mockResolvedValue(saved);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      await expect(
        service.register({ ...registerDto, confirmPassword: 'Mismatch1!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw generic error when email already exists (anti-enumeration)', async () => {
      mockUserRepo.findOne.mockResolvedValue(buildUser());

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException when USER role is missing', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOne.mockResolvedValue(null); // no USER role

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // login
  // -----------------------------------------------------------------------
  describe('login', () => {
    it('should return access_token and user', () => {
      const user = buildUser();

      const result = service.login(user);

      expect(result.access_token).toBe('signed-jwt-token');
      expect(result.user).toBe(user);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          email: user.email,
          roles: ['USER'],
        }),
      );
    });

    it('should handle user with no roles gracefully', () => {
      const user = buildUser({ roles: [] as Role[] });

      const result = service.login(user);

      expect(result.access_token).toBeDefined();
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [] }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // checkStatus
  // -----------------------------------------------------------------------
  describe('checkStatus', () => {
    it('should return access_token for active user', async () => {
      const user = buildUser();
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await service.checkStatus(1);

      expect(result).toHaveProperty('access_token');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const user = buildUser({ isActive: false });
      mockUsersService.findOne.mockResolvedValue(user);

      await expect(service.checkStatus(1)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // -----------------------------------------------------------------------
  // forgotPassword
  // -----------------------------------------------------------------------
  describe('forgotPassword', () => {
    it('should send email and return generic message when user exists', async () => {
      const user = buildUser();
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      const result = await service.forgotPassword({ email: 'juan@test.com' });

      expect(result.message).toContain('Si el correo electrónico existe');
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'juan@test.com',
        expect.any(String),
        'Juan',
      );
    });

    it('should return same generic message when user does NOT exist (anti-enumeration)', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'ghost@test.com',
      });

      expect(result.message).toContain('Si el correo electrónico existe');
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // validateResetToken
  // -----------------------------------------------------------------------
  describe('validateResetToken', () => {
    it('should return { valid: true } for a valid non-expired token', async () => {
      const user = buildUser({
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
      });
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.validateResetToken('some-raw-token');

      expect(result).toEqual({ valid: true });
    });

    it('should return { valid: false } when token is not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.validateResetToken('bad-token');

      expect(result).toEqual({ valid: false });
    });

    it('should return { valid: false } when token is expired', async () => {
      const user = buildUser({
        resetPasswordExpires: new Date(Date.now() - 1000), // expired
      });
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.validateResetToken('expired-token');

      expect(result).toEqual({ valid: false });
    });
  });

  // -----------------------------------------------------------------------
  // resetPassword
  // -----------------------------------------------------------------------
  describe('resetPassword', () => {
    it('should hash new password and clear reset fields', async () => {
      const user = buildUser({
        resetPasswordToken: 'hashed-token',
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
      });
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      const result = await service.resetPassword({
        token: 'raw-token',
        newPassword: 'NewSecureP@ss2',
      });

      expect(result.message).toBe('Contraseña actualizada exitosamente');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          resetPasswordToken: null,
          resetPasswordExpires: null,
        }),
      );
      // Password should have been changed (hashed)
      const savedUser = mockUserRepo.save.mock.calls[0][0] as User;
      expect(await bcrypt.compare('NewSecureP@ss2', savedUser.password)).toBe(
        true,
      );
    });

    it('should throw BadRequestException when token is invalid', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: 'bad-token',
          newPassword: 'NewSecureP@ss2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      const user = buildUser({
        resetPasswordExpires: new Date(Date.now() - 1000),
      });
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.resetPassword({
          token: 'expired',
          newPassword: 'NewSecureP@ss2',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // googleLogin
  // -----------------------------------------------------------------------
  describe('googleLogin', () => {
    const googleReq = {
      user: {
        googleId: 'g-123',
        email: 'google@test.com',
        emailVerified: true,
        firstName: 'Goo',
        lastName: 'Gle',
        picture: 'https://photo.url/me.jpg',
      },
    };

    it('should throw BadRequestException when req.user is missing', async () => {
      await expect(
        service.googleLogin({ user: undefined } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Google email is not verified', async () => {
      const unverifiedReq = {
        user: { ...googleReq.user, emailVerified: false },
      };
      await expect(service.googleLogin(unverifiedReq as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should link googleId to existing user without one', async () => {
      const existing = buildUser({
        email: 'google@test.com',
        googleId: undefined,
        avatarUrl: null,
      });
      mockUserRepo.findOne.mockResolvedValue(existing);
      mockUserRepo.save.mockResolvedValue(existing);

      const result = await service.googleLogin(googleReq as never);

      expect(result).toHaveProperty('access_token');
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'g-123',
          isEmailVerified: true,
          avatarUrl: 'https://photo.url/me.jpg',
        }),
      );
    });

    it('should not re-link when user already has googleId', async () => {
      const existing = buildUser({
        email: 'google@test.com',
        googleId: 'g-123',
        avatarUrl: 'https://existing.jpg',
      });
      mockUserRepo.findOne.mockResolvedValue(existing);

      const result = await service.googleLogin(googleReq as never);

      expect(result).toHaveProperty('access_token');
      expect(existing.avatarUrl).toBe('https://existing.jpg');
    });

    it('should auto-register a new user when not found with null password', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOne.mockResolvedValue(mockRole);
      const newUser = buildUser({
        email: 'google@test.com',
        googleId: 'g-123',
        password: null,
      });
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      const result = await service.googleLogin(googleReq as never);

      expect(result).toHaveProperty('access_token');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'google@test.com',
          googleId: 'g-123',
          isEmailVerified: true,
          password: null,
        }),
      );
    });

    it('should throw InternalServerErrorException when USER role is missing for OAuth registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockRoleRepo.findOne.mockResolvedValue(null);

      await expect(service.googleLogin(googleReq as never)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
