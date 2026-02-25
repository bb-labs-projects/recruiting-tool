/**
 * Known freemail/consumer email domains.
 * Used to flag employer registrations from non-corporate email addresses.
 */
export const FREEMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
  'fastmail.com',
  'tutanota.com',
  'tuta.com',
  'hey.com',
  'pm.me',
  'yahoo.co.uk',
  'yahoo.co.in',
  'hotmail.co.uk',
  'outlook.co.uk',
  'googlemail.com',
  'inbox.com',
  'mail.ru',
  'rediffmail.com',
])

/**
 * Extract the domain part from an email address.
 */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

/**
 * Check if an email domain is a known freemail provider.
 */
export function isFreemailDomain(domain: string): boolean {
  return FREEMAIL_DOMAINS.has(domain.toLowerCase())
}
