import { FiGithub, FiMail, FiTwitter } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>TrafficAI</h3>
          <p style={{color: 'var(--text-secondary)'}}>
            Intelligent traffic management system using AI to optimize flow 
            and prioritize emergency vehicles.
          </p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/cameras">Live Cameras</Link></li>
            <li><Link to="/simulation">Simulation</Link></li>
            <li><Link to="/emergency">Emergency</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Resources</h3>
          <ul className="footer-links">
            <li><Link to="/analytics">Analytics</Link></li>
            <li><Link to="/alerts">Alerts</Link></li>
            <li><Link to="/about">Documentation</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Connect</h3>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
            <a href="#" style={{color: 'var(--text-secondary)'}}>
              <FiGithub size={20} />
            </a>
            <a href="#" style={{color: 'var(--text-secondary)'}}>
              <FiTwitter size={20} />
            </a>
            <a href="#" style={{color: 'var(--text-secondary)'}}>
              <FiMail size={20} />
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 TrafficAI System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;