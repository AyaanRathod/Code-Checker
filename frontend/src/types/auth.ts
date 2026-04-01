export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  department: string | null;
  avatar_url: string | null;
  auth_provider: 'local' | 'google';
  created_at: string | null;
  last_login_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/** Returns "Dr. Smith", "Prof. Jones", or just "Jane" depending on what's available. */
export function formatDisplayName(user: AuthUser): string {
  const parts: string[] = [];
  if (user.title) parts.push(user.title);
  if (user.last_name) parts.push(user.last_name);
  if (parts.length === 0 && user.first_name) parts.push(user.first_name);
  return parts.join(' ') || user.username;
}

/** Returns initials for the avatar circle, e.g. "JS" for Jane Smith. */
export function getInitials(user: AuthUser): string {
  const f = user.first_name?.[0] ?? '';
  const l = user.last_name?.[0] ?? '';
  return (f + l).toUpperCase() || user.username.slice(0, 2).toUpperCase();
}

/** Deterministic colour from a string, picking from the CodeSimilar palette. */
export function getAvatarColor(seed: string): string {
  const palette = ['#991b1b', '#1e40af', '#065f46', '#92400e', '#4c1d95', '#0f766e'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
