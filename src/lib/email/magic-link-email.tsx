import { Resend } from 'resend'

/**
 * Send a magic link sign-in email via Resend.
 *
 * Uses inline HTML for the email template. This is simpler and more
 * reliable across email clients than React email components.
 * Can upgrade to @react-email/components later if needed.
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<void> {
  const appName = process.env.APP_NAME ?? 'IP Lawyer Recruiting'
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: `${appName} <${process.env.EMAIL_FROM}>`,
    to: [email],
    subject: `Sign in to ${appName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                Sign in to ${appName}
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
                Click the button below to sign in. This link expires in 10 minutes.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${magicLinkUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#71717a;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0;" />
              <p style="margin:0;font-size:11px;line-height:1.5;color:#a1a1aa;">
                For your security: this link can only be used once and it expires in 10 minutes. Never share this link with anyone.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  })

  if (error) {
    throw new Error(`Failed to send magic link email: ${error.message}`)
  }
}
