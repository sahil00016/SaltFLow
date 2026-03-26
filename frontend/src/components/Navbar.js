import { NavLink } from 'react-router-dom';

const SIDEBAR_BG = '#0f1b35';

const sections = [
  {
    label: 'Operations',
    description: 'Daily work & data entry',
    links: [
      { to: '/inventory',   label: 'Stock',     sub: 'Manage inventory'  },
      { to: '/orders',      label: 'Orders',    sub: 'Create & track'    },
      { to: '/dispatch',    label: 'Dispatch',  sub: 'Send out orders'   },
      { to: '/outstanding', label: 'Payments',  sub: 'Outstanding dues'  },
    ],
  },
  {
    label: 'Management',
    description: 'Review & verify',
    links: [
      { to: '/',        label: 'Dashboard',      sub: 'Business overview' },
      { to: '/ledger',  label: 'Client Ledger',  sub: 'Per-client history' },
      { to: '/logs',    label: 'Audit Log',       sub: 'Full history'      },
    ],
  },
];

export default function Navbar({ onLogout }) {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      backgroundColor: SIDEBAR_BG,
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
    }}>

      {/* Brand */}
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ color: '#fff', fontWeight: '800', fontSize: '20px', letterSpacing: '1px' }}>
          SaltFlow
        </div>
        <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: '3px' }}>
          Inventory & Dispatch
        </div>
      </div>

      {/* Sections */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '8px' }}>
        {sections.map(({ label, links }) => (
          <div key={label} style={{ marginTop: '20px' }}>
            {/* Section header */}
            <div style={{ padding: '0 20px 6px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '1.3px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.28)',
              }}>
                {label}
              </div>
            </div>

            {/* Links */}
            {links.map(({ to, label: lbl, sub }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '9px 20px',
                  textDecoration: 'none',
                  borderLeft: isActive ? '3px solid #4d90fe' : '3px solid transparent',
                  backgroundColor: isActive ? 'rgba(77,144,254,0.13)' : 'transparent',
                  transition: 'background-color 0.12s',
                })}
              >
                {({ isActive }) => (
                  <>
                    <div style={{
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
                      fontSize: '13.5px',
                      fontWeight: isActive ? '600' : '400',
                    }}>
                      {lbl}
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.32)',
                      fontSize: '11px',
                      marginTop: '1px',
                    }}>
                      {sub}
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.55)',
            padding: '8px 12px',
            borderRadius: '5px',
            fontSize: '12.5px',
            cursor: 'pointer',
            fontWeight: '500',
            letterSpacing: '0.2px',
          }}
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}