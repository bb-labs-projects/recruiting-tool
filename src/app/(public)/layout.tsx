/**
 * Public layout -- minimal wrapper for login, verify, and MFA pages.
 * No auth checks -- public routes are accessible to everyone.
 * Individual pages handle their own layout (e.g. split layout for login).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
