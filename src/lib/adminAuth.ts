export const ADMIN_EMAILS = [
  "voltaravn@gmail.com",
  "tuanmanhbh@gmail.com",
] as const;

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adminEmail) => adminEmail === normalizedEmail);
}
