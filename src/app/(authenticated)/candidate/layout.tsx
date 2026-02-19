/**
 * Candidate layout -- simple pass-through wrapper.
 * Candidate-specific navigation can be added here later.
 * Auth is already verified by the parent (authenticated) layout.
 */
export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="p-6">{children}</div>
}
