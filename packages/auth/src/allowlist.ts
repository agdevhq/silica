export type AllowlistConfig = {
  allowedEmails?: string[];
  allowedDomains?: string[];
};

export function isEmailAllowed(email: string | undefined | null, config: AllowlistConfig): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowedEmails = new Set((config.allowedEmails ?? []).map((item) => item.trim().toLowerCase()));
  if (allowedEmails.has(normalized)) return true;

  return (config.allowedDomains ?? []).some((domain) => {
    const normalizedDomain = domain.trim().replace(/^@/, "").toLowerCase();
    return normalized.endsWith(`@${normalizedDomain}`);
  });
}

export function hasAllowlist(config: AllowlistConfig): boolean {
  return Boolean(config.allowedEmails?.length || config.allowedDomains?.length);
}
