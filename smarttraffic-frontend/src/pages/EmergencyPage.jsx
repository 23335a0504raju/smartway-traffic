import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiMap, FiNavigation, FiPlay } from 'react-icons/fi';

const EmergencyPage = () => {
  const [activeEmergency, setActiveEmergency] = useState(0);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/emergencies');
      const data = await res.json();

      // Transform DB data to UI format
      const formatted = data.map(log => {
        const analysis = log.analysis_data || {};
        let type = 'Unknown Emergency';
        if (analysis.ambulance > 0) type = 'Ambulance';
        else if (analysis['fire truck'] > 0 || analysis['firetruck'] > 0) type = 'Fire Truck';
        else if (analysis.police > 0) type = 'Police Car';
        else if (analysis.ACCIDENT && analysis.ACCIDENT > 0) type = 'Accident';

        // Determine Priority
        let priority = 'High';
        if (type === 'Accident' || type === 'Fire Truck') priority = 'Critical';

        // Location logic
        const loc = log.videos ? `${log.videos.road_name || 'Main Road'}, ${log.videos.city || 'City'}` : 'Unknown Location';

        return {
          id: log.id,
          type: type,
          priority: priority,
          location: loc,
          time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          fullDate: new Date(log.created_at).toLocaleString(),
          eta: 'Calculating...', // Dynamic ETA would require Real-time GPS
          status: 'Active',
          vehicleId: `REL-${log.id.toString().slice(-4).toUpperCase()}`, // Mock ID from DB ID
          destination: 'City General Hospital',
          snapshot: log.snapshot_url
        };
      });
      setEmergencies(formatted);
    } catch (err) {
      console.error("Failed to load emergencies", err);
    } finally {
      setLoading(false);
    }
  };

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSetRoute = (hospitalName) => {
    if (!emergencies[activeEmergency]) return;
    const start = encodeURIComponent(emergencies[activeEmergency].location);
    const end = encodeURIComponent(hospitalName);
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}`, '_blank');
  };

  const handleNotify = () => {
    showToast(" Authorities have been notified of the ongoing emergency.", "success");
    // In a real app, this would call POST /api/notify
  };

  const handleOptimize = () => {
    showToast("Traffic signals have been optimized for emergency corridor.", "success");
    // In a real app, this would call POST /api/override
  };

  const handleOverride = () => {
    showToast("Switched to Manual Override Mode.", "warning");
  };

  const hospitals = [
    { name: 'City General Hospital', distance: '2.1 km', beds: 45 },
    { name: 'Central Medical Center', distance: '3.4 km', beds: 23 },
    { name: 'Unity Hospital', distance: '4.2 km', beds: 67 }
  ];

  return (
    <div className="fade-in relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-bold flex items-center gap-2 animate-bounce
                ${toast.type === 'warning' ? 'bg-orange-600' : 'bg-green-600'}`}>
          {toast.type === 'warning' ? <FiAlertTriangle /> : <FiNavigation />}
          {toast.msg}
        </div>
      )}
      <div className="emergency-grid">
        {/* Emergency List */}
        <div className="emergency-list">
          <div className="card-header">
            <h3 className="card-title">
              <FiAlertTriangle style={{ marginRight: '0.5rem' }} />
              Active Emergencies
            </h3>
            <div className="emergency-indicator">
              {emergencies.length} Active
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center text-[var(--text-secondary)]">Loading live data...</div>
          ) : emergencies.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-lg text-green-500">
              <FiNavigation className="mx-auto mb-2" size={24} />
              No Active Emergencies Detected
            </div>
          ) : (
            emergencies.map((emergency, index) => (
              <div
                key={emergency.id}
                className="emergency-item"
                style={{
                  background: index === activeEmergency ? 'rgba(37, 99, 235, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                  borderLeftColor: index === activeEmergency ? 'var(--primary)' : 'var(--danger)',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveEmergency(index)}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: index === activeEmergency ? 'var(--primary)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {emergency.type === 'Ambulance' ? '🚑' :
                    emergency.type === 'Fire Truck' ? '🚒' :
                      emergency.type === 'Police Car' ? '🚓' : '💥'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                      {emergency.type}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: emergency.priority === 'Critical' ? 'var(--danger)' :
                        emergency.priority === 'High' ? 'var(--warning)' : 'var(--accent)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {emergency.priority}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    📍 {emergency.location}
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <span>🕒 {emergency.time}</span>
                    <span title={emergency.fullDate}>{emergency.fullDate}</span>
                  </div>
                </div>

                <div style={{
                  textAlign: 'right'
                }}>
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--success)',
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    {emergency.status}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEmergency(index);
                    }}
                  >
                    <FiPlay />
                    Track
                  </button>
                </div>
              </div>
            )))}
        </div>

        {/* Emergency Map & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Map View */}
          <div className="emergency-map">
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '8px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {emergencies.length > 0 && emergencies[activeEmergency]?.snapshot ? (
                <img
                  src={`http://localhost:5000/uploads/${emergencies[activeEmergency].snapshot.split(/[\\/]/).pop()}`}
                  alt="Emergency Snapshot"
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                /* Simplified Map Fallback */
                <div style={{
                  width: '80%',
                  height: '80%',
                  background: 'var(--bg-primary)',
                  borderRadius: '8px',
                  position: 'relative',
                  border: '2px solid var(--border)'
                }}>
                  {/* ... existing map geometry ... */}
                  {/* Roads */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0',
                    width: '100%',
                    height: '4px',
                    background: '#64748b',
                    transform: 'translateY(-50%)'
                  }}></div>

                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '50%',
                    width: '4px',
                    height: '100%',
                    background: '#64748b',
                    transform: 'translateX(-50%)'
                  }}></div>

                  {/* Emergency Vehicle */}
                  <div style={{
                    position: 'absolute',
                    top: '48%',
                    left: '30%',
                    width: '20px',
                    height: '10px',
                    background: 'var(--danger)',
                    borderRadius: '2px',
                    animation: 'pulse 1s infinite'
                  }}></div>
                </div>
              )}

              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.8)',
                padding: '10px 20px',
                borderRadius: '20px',
                color: 'white',
                textAlign: 'center'
              }}>
                <div className="font-bold flex items-center gap-2">
                  <FiMap /> Live Feed: {emergencies[activeEmergency]?.location || 'N/A'}
                </div>
              </div>

            </div>
          </div>


          {/* Hospital Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <FiNavigation style={{ marginRight: '0.5rem' }} />
                Nearby Hospitals
              </h3>
            </div>

            <div>
              {hospitals.map((hospital, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem'
                    }}>
                      {hospital.name}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)'
                    }}>
                      📍 {hospital.distance} away
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.25rem'
                    }}>
                      {hospital.beds} beds available
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem' }}
                      onClick={() => handleSetRoute(hospital.name)}
                    >
                      Set Route
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Controls */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Emergency Response</h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <button
                className="btn btn-success"
                onClick={handleOptimize}
              >
                Clear Route
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleNotify}
              >
                Notify Authorities
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOptimize}
              >
                Optimize Traffic
              </button>
              <button
                className="btn btn-danger"
                onClick={handleOverride}
              >
                Manual Override
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyPage;