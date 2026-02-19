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
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            IP Lawyer Recruiting
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}
