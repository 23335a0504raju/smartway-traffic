import { useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from './components/Layout/Footer';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import AboutPage from './pages/AboutPage';
import AlertsPage from './pages/AlertsPage';
import AnalysisPage from './pages/AnalysisPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DashboardPage from './pages/DashboardPage';
import EmergencyPage from './pages/EmergencyPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SimulationPage from './pages/SimulationPage';
import SumoPage from './pages/SumoPage';
import './styles/pages.css';



function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiMode, setAiMode] = useState(true);

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
          Loading...
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app">
                  <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                  <Sidebar
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    aiMode={aiMode}
                    onAiModeToggle={setAiMode}
                  />

                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage aiMode={aiMode} />} />

                      <Route path="/simulation" element={<SimulationPage />} />
                      <Route path="/sumo" element={<SumoPage />} />
                      <Route path="/emergency" element={<EmergencyPage />} />
                      <Route path="/alerts" element={<AlertsPage />} />
                      <Route path="/analysis" element={<AnalysisPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                  </main>

                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;