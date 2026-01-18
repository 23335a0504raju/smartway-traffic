import { FiAward, FiBook, FiGithub, FiUsers } from 'react-icons/fi';

const AboutPage = () => {
  const teamMembers = [
    { name: 'Atmakuri Neelima', role: '22331A0507', initial: 'N' },
    { name: 'Ch. Raju', role: '23335A0504', initial: 'R' },
    { name: 'Gorle Prasad Rao', role: '22331A0556', initial: 'P' },
    { name: 'D. Geetha Sri', role: '22335A0505', initial: 'G' },
  ];

  return (
    <div className="about-container fade-in">
      {/* Project Report Header */}
      <div className="about-section" style={{ textAlign: 'center', borderBottom: '2px solid var(--border)' }}>
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Intelligent Traffic Management for Smart Cities</h1>

        <p style={{ maxWidth: '800px', margin: '0 auto 2rem', lineHeight: '1.8' }}>
          Submitted in partial fulfillment of the requirements for the award of the degree of<br />
          <strong>Bachelor of Technology</strong><br />
          in<br />
          <strong>COMPUTER SCIENCE AND ENGINEERING</strong>
        </p>

        <div style={{ margin: '3rem 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem' }}>Under the Supervision of</p>
          <h2 style={{ color: 'var(--text-primary)' }}>Dr. C. Kalyan Chakravarthy</h2>
          <p style={{ color: 'var(--primary)' }}>Professor</p>
        </div>
      </div>

      {/* Project Team */}
      <div className="about-section">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>Project By</h2>

        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div key={index} className="team-member">
              <div className="member-avatar" style={{ background: 'var(--primary)', color: 'white' }}>
                {member.initial}
              </div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{member.name}</h4>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                background: 'var(--bg-secondary)',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Abstract / Intro */}
      <div className="about-section">
        <h2>Abstract</h2>
        <p>
          Traffic congestion is a major problem in modern cities, leading to delays, increased fuel consumption,
          and emergency response inefficiencies. <strong>"Smart Way Traffic"</strong> is an intelligent system
          designed to analyze traffic flow, detect congestion, and optimize signal timings using AI-powered video analysis.
        </p>
      </div>

      {/* Documentation Links */}
      <div className="about-section">
        <h2>Documentation & Resources</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}>
            <FiBook size={24} />
            <div>
              <div style={{ fontWeight: '600' }}>User Guide</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Complete system documentation
              </div>
            </div>
          </a>

          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}>
            <FiGithub size={24} />
            <div>
              <div style={{ fontWeight: '600' }}>GitHub Repository</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Source code and contributions
              </div>
            </div>
          </a>

          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}>
            <FiUsers size={24} />
            <div>
              <div style={{ fontWeight: '600' }}>API Documentation</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Integration guides and references
              </div>
            </div>
          </a>

          <a href="#" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            transition: 'all 0.3s ease'
          }}>
            <FiAward size={24} />
            <div>
              <div style={{ fontWeight: '600' }}>Case Studies</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Real-world implementations
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Contact Information */}
      <div className="about-section">
        <h2>Contact & Support</h2>
        <p>
          For technical support, feature requests, or partnership inquiries,
          please reach out to our team.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Email</h4>
            <p style={{ color: 'var(--text-secondary)' }}>smilyraju8464@gmail.com</p>
          </div>

          <div>
            <h4 style={{ marginBottom: '0.5rem' }}>Phone</h4>
            <p style={{ color: 'var(--text-secondary)' }}>6281924785</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;