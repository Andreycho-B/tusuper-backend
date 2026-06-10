export const ALLOWED_FRONTEND_URLS = [
  'http://localhost:4200',
  'https://tusuper-frontend.netlify.app',
  'https://tusuper.com',
] as const;

export type AllowedFrontendUrl = (typeof ALLOWED_FRONTEND_URLS)[number];

export function validateFrontendUrl(url: string): string {
  if (ALLOWED_FRONTEND_URLS.includes(url as AllowedFrontendUrl)) {
    return url;
  }
  return ALLOWED_FRONTEND_URLS[0];
}
