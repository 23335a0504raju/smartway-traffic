import { FiBarChart2, FiPlay, FiShield, FiZap } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const features = [
    {
      icon: <FiZap />,
      title: 'AI-Powered Optimization',
      description: 'Real-time traffic flow optimization using advanced machine learning algorithms.'
    },
    {
      icon: <FiShield />,
      title: 'Emergency Priority',
      description: 'Automatic detection and prioritization of emergency vehicles for faster response times.'
    },
    {
      icon: <FiBarChart2 />,
      title: 'Live Analytics',
      description: 'Comprehensive monitoring and analytics dashboard for traffic performance insights.'
    }
  ];

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Intelligent Traffic
            <br />
            Management System
          </h1>
          <p className="hero-subtitle">
            Revolutionizing urban mobility with AI-driven traffic optimization,
            emergency vehicle prioritization, and real-time monitoring for smarter cities.
          </p>
          <div className="hero-actions">
            <Link to="/simulation" className="btn btn-primary">
              <FiPlay /> Start Simulation
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              <FiBarChart2 /> View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card slide-up">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </section>

      {/* Stats Section */}
      <section style={{
        background: 'var(--bg-secondary)',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--primary)' }}>15+</div>
            <div style={{ color: 'var(--text-secondary)' }}>Junctions Managed</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--success)' }}>45%</div>
            <div style={{ color: 'var(--text-secondary)' }}>Traffic Reduction</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent)' }}>30s</div>
            <div style={{ color: 'var(--text-secondary)' }}>Avg. Response Time</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--danger)' }}>99.9%</div>
            <div style={{ color: 'var(--text-secondary)' }}>System Uptime</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;