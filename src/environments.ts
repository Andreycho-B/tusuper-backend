/* eslint-disable prettier/prettier */
export const environments = {
  dev: '.env',
  stg: '.stg.env',
  prod: '.prod.env',
  test: '.env.test',
};

/** Normaliza NODE_ENV de Render/CI al archivo .env del proyecto. */
export function resolveEnvFile(): string | undefined {
  if (process.env.RENDER === 'true' || process.env.SKIP_ENV_FILE === 'true') {
    return undefined;
  }

  const raw = process.env.NODE_ENV || 'dev';
  const key =
    raw === 'production' ? 'prod' : (raw as keyof typeof environments);

  return environments[key] ?? environments.dev;
}
