import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { verifyDpopProof, computeAth } from '../dpop/dpop.utils';
import type { DpopPublicKey } from '../dpop/dpop.types';

@Injectable()
export class DpopGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const dpopProof = request.headers['dpop'] as string | undefined;

    if (!dpopProof) {
      return true;
    }

    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required for DPoP');
    }

    const userId = user.userId;
    const dbUser = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'dpopPublicKey'],
    });

    if (!dbUser?.dpopPublicKey) {
      throw new UnauthorizedException(
        'DPoP proof provided but no public key registered',
      );
    }

    let publicKey: DpopPublicKey;
    try {
      publicKey = JSON.parse(dbUser.dpopPublicKey) as DpopPublicKey;
    } catch {
      throw new UnauthorizedException('Invalid stored DPoP public key');
    }

    try {
      const accessToken = request.headers['authorization']?.replace('Bearer ', '') ||
        request.cookies?.['token'];

      const expectedAth = accessToken ? computeAth(accessToken) : undefined;

      const protocol = request.protocol || 'https';
      const host = request.headers['host'] || 'localhost';
      const htu = `${protocol}://${host}${request.originalUrl}`;

      await verifyDpopProof(
        dpopProof,
        publicKey,
        request.method,
        htu,
        expectedAth,
      );

      request.dpop = { proof: true };
      return true;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'DPoP verification failed';
      throw new UnauthorizedException(message);
    }
  }
}
