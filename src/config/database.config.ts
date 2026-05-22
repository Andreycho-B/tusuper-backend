export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export function resolveDatabaseConfig(): DatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: Number.parseInt(parsed.port || '5432', 10),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      name: parsed.pathname.replace(/^\//, ''),
    };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number.parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    name: process.env.POSTGRES_DB || 'auth_db',
  };
}

export function isManagedPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.RENDER);
}
