import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: ['USER'], roles: [] },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as import('@nestjs/common').ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user has no roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: [], roles: [] },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as import('@nestjs/common').ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('No roles assigned to user'),
    );
  });

  it('should allow access when user has required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['ADMIN', 'USER']);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: ['USER'], roles: [] },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as import('@nestjs/common').ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: ['USER'], roles: [] },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as import('@nestjs/common').ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
