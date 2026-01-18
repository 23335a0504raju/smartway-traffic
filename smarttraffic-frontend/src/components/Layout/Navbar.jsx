import { FiActivity, FiMenu, FiMoon, FiSun } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="logo">
          <FiActivity className="logo-icon" />
          TrafficAI
        </Link>

        <div className="nav-links">
          <Link
            to="/dashboard"
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link
            to="/about"
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            About
          </Link>
          <Link
            to="/simulation"
            className={`nav-link ${location.pathname === '/simulation' ? 'active' : ''}`}
          >
            Simulation
          </Link>
          <Link
            to="/emergency"
            className={`nav-link ${location.pathname === '/emergency' ? 'active' : ''}`}
          >
            Emergency
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Toggle Theme"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.5rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
          </button>

          <button className="menu-toggle" onClick={onMenuToggle}>
            <FiMenu />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;