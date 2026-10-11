const TOKEN_KEY = "token";
const COOKIE_TOKEN = "hulms_token";
const COOKIE_ROLES = "hulms_roles";

function writeCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function eraseCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Store token in localStorage AND write a cookie so the
 * Next.js Edge middleware can verify auth server-side.
 * Pass roles so middleware can enforce role-based access.
 */
export const setToken = (token: string, roles: string[] = []): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  writeCookie(COOKIE_TOKEN, token, 7);
  writeCookie(COOKIE_ROLES, roles.join(","), 7);
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  eraseCookie(COOKIE_TOKEN);
  eraseCookie(COOKIE_ROLES);
};

export const isAuthenticated = (): boolean => Boolean(getToken());
