// Dev/experiment endpoints spend free-tier quota. They answer only on
// non-production deployments (which Vercel protects with login by default).
export function devOnly(): Response | null {
  if (process.env.VERCEL_ENV === 'production') {
    return Response.json({ error: 'not available in production' }, { status: 404 });
  }
  return null;
}
