import type { JWK } from 'jose';

export interface DpopProofPayload {
  jti: string;
  htm: string;
  htu: string;
  iat: number;
  ath?: string;
}

export interface DpopPublicKey {
  kty: 'EC';
  crv: 'P-256' | 'P-384';
  x: string;
  y: string;
}

export function isDpopJwk(value: unknown): value is JWK {
  if (!value || typeof value !== 'object') return false;
  const jwk = value as Record<string, unknown>;
  return (
    jwk.kty === 'EC' &&
    (jwk.crv === 'P-256' || jwk.crv === 'P-384') &&
    typeof jwk.x === 'string' &&
    jwk.x.length > 0 &&
    typeof jwk.y === 'string' &&
    jwk.y.length > 0
  );
}
