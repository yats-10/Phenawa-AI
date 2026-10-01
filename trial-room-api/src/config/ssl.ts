/**
 * Decides whether the Postgres connection needs TLS.
 *
 * Managed providers (Railway, Neon, Supabase, RDS) terminate TLS with
 * certificates that are not in the Node trust store, so verification is
 * relaxed while the transport stays encrypted. Set DATABASE_SSL explicitly
 * ("true" / "false") to override the host-based guess.
 */
export function buildDatabaseSsl(
  databaseUrl: string | undefined,
  override: string | undefined,
): { rejectUnauthorized: boolean } | false {
  if (override !== undefined && override !== '') {
    return override.toLowerCase() === 'true' ? { rejectUnauthorized: false } : false;
  }

  if (!databaseUrl) return false;

  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    return false;
  }

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.railway.internal');

  return isLocal ? false : { rejectUnauthorized: false };
}
