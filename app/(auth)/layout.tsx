export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  )
}
