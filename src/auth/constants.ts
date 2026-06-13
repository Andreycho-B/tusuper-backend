import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('AuthConstants');

export function validateFrontendUrl(
  configServiceOrUrl: ConfigService | string,
  requestedUrl?: string,
): string {
  let allowedOrigin: string;

  if (typeof configServiceOrUrl === 'string') {
    allowedOrigin = configServiceOrUrl;
  } else {
    allowedOrigin =
      configServiceOrUrl.get<string>('FRONTEND_URL') ||
      (requestedUrl ?? 'http://localhost:4200');
  }

  if (requestedUrl && allowedOrigin.includes(requestedUrl)) {
    return requestedUrl;
  }

  const firstUrl = allowedOrigin.split(',')[0].trim();
  if (!requestedUrl) {
    logger.debug(`Redirecting to configured frontend: ${firstUrl}`);
  } else {
    logger.warn(
      `Frontend URL "${requestedUrl}" not in whitelist, defaulting to: ${firstUrl}`,
    );
  }
  return firstUrl;
}
