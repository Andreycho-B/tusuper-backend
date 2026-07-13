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

  const allowedHosts = allowedOrigin.split(',').map((u) => {
    try {
      return new URL(u.trim()).host;
    } catch {
      return u.trim();
    }
  });

  if (requestedUrl) {
    try {
      const requestedHost = new URL(requestedUrl).host;
      if (allowedHosts.includes(requestedHost)) {
        return requestedUrl;
      }
    } catch {
      // invalid URL, fall through
    }
  }

  const firstUrl = allowedOrigin.split(',')[0].trim();
  if (requestedUrl) {
    logger.warn(
      `Frontend URL "${requestedUrl}" not in whitelist, defaulting to: ${firstUrl}`,
    );
  }
  return firstUrl;
}
