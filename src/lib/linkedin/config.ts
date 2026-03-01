export const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'
export const SCOPES = 'openid profile email'
export const REDIRECT_PATH = '/api/linkedin/callback'

const clientId = process.env.LINKEDIN_CLIENT_ID ?? ''
const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

export function getRedirectUri() {
  return `${appUrl}${REDIRECT_PATH}`
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
  })
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`
}
