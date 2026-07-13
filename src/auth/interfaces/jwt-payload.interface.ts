export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  jti?: string;
  exp?: number;
  iat?: number;
  cnf?: { jkt: string };
}
