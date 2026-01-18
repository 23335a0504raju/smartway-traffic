import { FiLogOut, FiMail, FiShield, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user, signOut } = useAuth();

  // Safe destructuring with fallbacks for common Google OAuth fields
  const { user_metadata } = user || {};
  const { full_name, name, avatar_url, picture, photo_url, email: metaEmail } = user_metadata || {};

  const displayName = full_name || name || 'User';
  // Check multiple common fields for the avatar
  const displayImage = avatar_url || picture || photo_url;
  const displayEmail = user?.email || metaEmail;

  // Debug: Log to console to verify structure
  console.log("Current User:", user);

  return (
    <div className="profile-container fade-in">
      <div className="profile-card card">
        <div className="profile-header">
          <div className="avatar-large">
            {displayImage ? (
              <img
                src={displayImage}
                alt="Profile"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName);
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                <FiUser size={40} />
              </div>
            )}
          </div>
          <h2 className="profile-name">{displayName}</h2>
          <div className="profile-role">
            <FiShield className="role-icon" />
            <span>Administrator</span>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <div className="detail-icon">
              <FiMail />
            </div>
            <div>
              <label>Email Address</label>
              <div className="detail-value">{displayEmail}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <FiUser />
            </div>
            <div>
              <label>User ID</label>
              <div className="detail-value" style={{ fontSize: '0.9em', fontFamily: 'monospace' }}>
                {user?.id}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={signOut} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      </div>

      <style>{`
        .profile-container {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
        }
        
        .profile-card {
          width: 100%;
          max-width: 500px;
          text-align: center;
        }
        
        .avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid var(--bg-primary);
          box-shadow: var(--shadow-md);
          margin: 0 auto 1.5rem;
          overflow: hidden;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .avatar-placeholder {
          color: var(--text-secondary);
        }
        
        .profile-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        
        .profile-role {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }
        
        .profile-details {
          text-align: left;
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border);
        }
        
        .detail-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .detail-item:first-child {
          padding-top: 0;
        }
        
        .detail-icon {
          width: 40px;
          height: 40px;
          background: var(--bg-card);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          font-size: 1.25rem;
          border: 1px solid var(--border);
        }
        
        .detail-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        
        .detail-value {
          color: var(--text-primary);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
