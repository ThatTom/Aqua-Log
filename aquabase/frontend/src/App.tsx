import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Cog, PencilRuler, NotebookPen, ShieldCheck, type LucideIcon } from 'lucide-react'

function AquaDropIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 4.5 14 4.5 9.5C4.5 5.91 7.91 3 12 3C16.09 3 19.5 5.91 19.5 9.5C19.5 14 12 21 12 21Z"
        fill="#26C6DA" fillOpacity="0.2" stroke="#26C6DA" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M12 17.5V11" stroke="#43A047" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 15.5C12 15.5 8.5 13.5 8.5 10.5C8.5 10.5 12 11 12 15.5Z" fill="#43A047"/>
      <path d="M12 12.5C12 12.5 15.5 10.5 15.5 7.5C15.5 7.5 12 8 12 12.5Z" fill="#43A047"/>
    </svg>
  )
}
import Dashboard from './pages/Dashboard'
import TankDetail from './pages/TankDetail'
import SpeciesBrowser from './pages/SpeciesBrowser'
import TankDesigner from './pages/TankDesigner'
import Settings from './pages/Settings'
import LivestockJournal from './pages/LivestockJournal'
import CompatibilityChecker from './pages/CompatibilityChecker'
import { SettingsProvider, useSettings } from './context/SettingsContext'

function Nav() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useSettings()

  const link = (to: string, label: string, Icon: LucideIcon) => (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 14,
      background: pathname === to ? 'var(--blue-bg)' : 'transparent',
      color: pathname === to ? 'var(--blue)' : 'var(--text-2)',
      fontWeight: pathname === to ? 500 : 400,
    }}>
      <Icon size={14} />
      {label}
    </Link>
  )

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '12px 24px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, textDecoration: 'none' }}>
        <AquaDropIcon size={26} />
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '0.04em' }}>AQUA LOG</span>
          <span style={{ fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.06em', fontWeight: 500 }}>LOG. CARE. THRIVE.</span>
        </span>
      </span>
      {link('/', 'Dashboard', LayoutDashboard)}
      {link('/designer', 'Designer', PencilRuler)}
      {link('/species', 'Species browser', BookOpen)}
      {link('/compatibility', 'Compatibility', ShieldCheck)}
      {link('/journal', 'Journal', NotebookPen)}
      <span style={{ flex: 1 }} />
      <button
        onClick={toggleTheme}
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          fontSize: 15,
          padding: '4px 8px',
          border: '0.5px solid var(--border)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--text-2)',
          cursor: 'pointer',
          lineHeight: 1,
          marginRight: 4,
        }}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
      {link('/settings', 'Settings', Cog)}
    </nav>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
          <Nav />
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tanks/:id" element={<TankDetail />} />
              <Route path="/designer" element={<TankDesigner />} />
              <Route path="/species" element={<SpeciesBrowser />} />
              <Route path="/compatibility" element={<CompatibilityChecker />} />
              <Route path="/journal" element={<LivestockJournal />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </SettingsProvider>
  )
}
