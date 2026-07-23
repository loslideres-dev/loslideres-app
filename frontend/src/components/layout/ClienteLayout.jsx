import BottomNav from './BottomNav'

export default function ClienteLayout({ children }) {
  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto relative"
      style={{ background: '#F4F6FA' }}>
      {children}
      <BottomNav />
    </div>
  )
}