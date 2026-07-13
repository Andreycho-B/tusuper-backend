import * as crypto from 'crypto';
import { importJWK, jwtVerify, type JWK } from 'jose';
import type { DpopProofPayload, DpopPublicKey } from './dpop.types';

export function computeJwkThumbprint(jwk: JWK): string {
  const ec = jwk as { crv?: string; kty?: string; x?: string; y?: string };
  const normalized = JSON.stringify({
    crv: ec.crv,
    kty: ec.kty,
    x: ec.x,
    y: ec.y,
  });
  const hash = crypto.createHash('sha256').update(normalized).digest();
  return base64urlEncode(hash);
}

export function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

export function parseJwtParts(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const header = JSON.parse(base64urlDecode(parts[0]).toString('utf-8'));
  const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf-8'));
  return { header, payload, signature: parts[2] };
}

export async function verifyDpopProof(
  proof: string,
  publicKeyJwk: DpopPublicKey,
  expectedHtm: string,
  expectedHtu: string,
  expectedAth?: string,
): Promise<DpopProofPayload> {
  const { payload: rawPayload } = await jwtVerify(
    proof,
    await importJWK(publicKeyJwk as JWK, 'ES256'),
    {
      algorithms: ['ES256'],
      issuer: undefined,
    },
  );

  const payload = rawPayload as unknown as DpopProofPayload;

  if (!payload.jti || typeof payload.jti !== 'string') {
    throw new Error('DPoP proof missing jti');
  }

  if (payload.htm !== expectedHtm) {
    throw new Error(
      `DPoP proof htm mismatch: expected ${expectedHtm}, got ${payload.htm}`,
    );
  }

  const normalizedExpectedHtu = expectedHtu.split('?')[0];
  const normalizedActualHtu = (payload.htu || '').split('?')[0];
  if (normalizedActualHtu !== normalizedExpectedHtu) {
    throw new Error(
      `DPoP proof htu mismatch: expected ${normalizedExpectedHtu}, got ${normalizedActualHtu}`,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iat && payload.iat > now + 30) {
    throw new Error('DPoP proof iat is in the future');
  }
  if (payload.iat && payload.iat < now - 60) {
    throw new Error('DPoP proof iat is too old');
  }

  if (expectedAth && payload.ath && payload.ath !== expectedAth) {
    throw new Error('DPoP proof ath mismatch');
  }

  return payload;
}

export function computeAth(accessToken: string): string {
  const hash = crypto.createHash('sha256').update(accessToken).digest();
  return base64urlEncode(hash);
}
