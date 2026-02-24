/**
 * Public layout -- centered, minimal layout for login and verify pages.
 * No auth checks -- public routes are accessible to everyone.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-foreground">
            IP Lawyer Recruiting
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecting top IP talent with leading firms
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
