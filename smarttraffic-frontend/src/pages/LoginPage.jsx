import { useState } from 'react';
import { FiActivity, FiArrowRight } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const { user, signInWithGoogle } = useAuth();
    const [error, setError] = useState(null);

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleLogin = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container card">
                <div className="login-header">
                    <div className="logo-large">
                        <FiActivity className="logo-icon-large" />
                        <span className="brand-name">TrafficAI</span>
                    </div>
                    <h1>Welcome Back</h1>
                    <p className="login-subtitle">Sign in to access the Intelligent Traffic Management System</p>
                </div>

                <div className="login-actions">
                    <button onClick={handleLogin} className="google-btn">
                        <span className="google-icon">G</span> {/* Using text if icon not avail, but better to use icon */}
                        <span>Continue with Google</span>
                        <FiArrowRight />
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="login-footer">
                    <p>Protected by Enterprise Grade Security</p>
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          padding: 1rem;
        }

        .login-container {
          width: 100%;
          max-width: 480px;
          text-align: center;
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: 3rem 2rem;
          border-radius: 24px;
        }

        .logo-large {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 2rem;
          color: var(--primary);
        }

        .logo-icon-large {
          font-size: 3rem;
        }

        .brand-name {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-primary);
        }

        .login-subtitle {
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 1rem;
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        /* Dark mode adjustment for google btn if needed, usually google btn stays white or specific dark version */
        :root[data-theme="dark"] .google-btn {
             background: #2b2b2b;
             color: white;
             border-color: #444;
        }

        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .google-icon {
            font-weight: bold;
            font-size: 1.2rem;
            color: #4285F4;
        }

        .error-message {
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger);
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .login-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
        </div>
    );
};

export default LoginPage;
