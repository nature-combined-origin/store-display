/**
 * Normalizes ADMIN_PASSWORD_HASH from environment variables.
 * Local .env files may use \$ escaping for dotenv-expand; Vercel uses raw $2b$10$...
 */
export function getAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
  return hash.replace(/\\\$/g, "$");
}
