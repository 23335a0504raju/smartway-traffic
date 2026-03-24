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
  FiX,
  FiArchive
} from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isCollapsed }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: FiBarChart2, label: 'Dashboard' },
    { path: '/simulation', icon: FiPlay, label: 'Simulation' },
    { path: '/sumo', icon: FiCpu, label: 'SUMO Sim' },
    { path: '/sumo-history', icon: FiArchive, label: 'SUMO History' },
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
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-content">
          <div className="sidebar-section">
            <div className="sidebar-title">Navigation</div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.label}
                >
                  <Icon className="sidebar-link-icon flex-shrink-0" />
                  <span className="sidebar-link-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;