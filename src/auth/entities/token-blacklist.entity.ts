import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('token_blacklist')
export class TokenBlacklist {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  jti: string;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
