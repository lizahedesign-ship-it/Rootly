// Parses the Supabase password-recovery tokens out of a rootzy://reset-password
// deep link. Supabase appends them as a URL fragment (#access_token=...&type=recovery)
// since the client is configured for the implicit auth flow.
export function parseRecoveryTokensFromUrl(
  url: string,
): { accessToken: string; refreshToken: string } | null {
  const fragment = url.split('#')[1] ?? url.split('?')[1];
  if (!fragment) return null;

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (type !== 'recovery' || !accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
