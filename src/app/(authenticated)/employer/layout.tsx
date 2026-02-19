/**
 * Employer layout -- simple pass-through wrapper.
 * Employer-specific navigation can be added here later.
 * Auth is already verified by the parent (authenticated) layout.
 */
export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="p-6">{children}</div>
}
