import {
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiCpu,
  FiFileText,
  FiInfo,
  FiPlay,
  FiUploadCloud,
  FiUser,
  FiX
} from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose, aiMode, onAiModeToggle }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: FiBarChart2, label: 'Dashboard' },
    { path: '/simulation', icon: FiPlay, label: 'Simulation' },
    { path: '/sumo', icon: FiCpu, label: 'SUMO Sim' },
    { path: '/emergency', icon: FiAlertTriangle, label: 'Emergency' },
    { path: '/analysis', icon: FiUploadCloud, label: 'Video Analysis' },
    { path: '/history', icon: FiFileText, label: 'History' },
    { path: '/alerts', icon: FiBell, label: 'Alerts' },
    { path: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    { path: '/profile', icon: FiUser, label: 'My Profile' },
    { path: '/about', icon: FiInfo, label: 'About' },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <button className="btn btn-secondary" onClick={onClose} style={{ marginBottom: '2rem' }}>
            <FiX /> Close Menu
          </button>

          <div className="sidebar-section">
            <div className="sidebar-title">Navigation</div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="sidebar-link-icon" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ai-toggle">
            <div className="toggle-label">
              <span>AI Control Mode</span>
              <FiCpu />
            </div>
            <div
              className={`toggle-switch ${aiMode ? 'active' : ''}`}
              onClick={() => onAiModeToggle(!aiMode)}
            >
              <div className="toggle-slider"></div>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {aiMode ? 'AI is controlling traffic' : 'Manual mode active'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;