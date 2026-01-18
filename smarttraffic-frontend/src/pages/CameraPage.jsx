import { useState } from 'react';
import { FiAlertTriangle, FiMaximize, FiPause, FiPlay } from 'react-icons/fi';

const CameraPage = () => {
  const [playing, setPlaying] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(0);

  const cameras = [
    {
      id: 1,
      name: 'Junction J-01 - Main Street',
      location: 'Downtown Core',
      vehicles: 45,
      emergency: true
    },
    {
      id: 2,
      name: 'Junction J-02 - River Road',
      location: 'Financial District',
      vehicles: 32,
      emergency: false
    },
    {
      id: 3,
      name: 'Junction J-03 - Central Park',
      location: 'Residential Area',
      vehicles: 28,
      emergency: false
    },
    {
      id: 4,
      name: 'Junction J-04 - Highway Entrance',
      location: 'North Gateway',
      vehicles: 67,
      emergency: true
    }
  ];

  const CameraFeed = ({ camera }) => (
    <div className="camera-feed">
      <div className="camera-header">
        <div>
          <h3 style={{color: 'var(--text-primary)', marginBottom: '0.25rem'}}>
            {camera.name}
          </h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
            {camera.location}
          </p>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          {camera.emergency && (
            <div className="emergency-indicator">
              <FiAlertTriangle size={12} />
              Emergency
            </div>
          )}
          <button className="btn btn-secondary" style={{padding: '0.5rem'}}>
            <FiMaximize />
          </button>
        </div>
      </div>
      
      <div className="camera-video">
        {/* Mock Video Feed */}
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Simulated road lines */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '2px',
            background: 'repeating-linear-gradient(90deg, yellow, yellow 20px, transparent 20px, transparent 40px)'
          }}></div>
          
          {/* Vehicle detection boxes */}
          <div style={{
            position: 'absolute',
            top: '45%',
            left: '20%',
            width: '60px',
            height: '30px',
            border: '2px solid #00ff00',
            background: 'rgba(0, 255, 0, 0.1)'
          }}></div>
          
          <div style={{
            position: 'absolute',
            top: '48%',
            left: '60%',
            width: '80px',
            height: '35px',
            border: '2px solid #00ff00',
            background: 'rgba(0, 255, 0, 0.1)'
          }}></div>
          
          {camera.emergency && (
            <div style={{
              position: 'absolute',
              top: '52%',
              left: '40%',
              width: '70px',
              height: '40px',
              border: '2px solid #ff0000',
              background: 'rgba(255, 0, 0, 0.2)',
              animation: 'pulse 1s infinite'
            }}></div>
          )}
          
          <div style={{color: 'var(--text-secondary)', textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📹</div>
            <div>Live Camera Feed</div>
            <div style={{fontSize: '0.875rem', marginTop: '0.5rem'}}>
              {playing ? 'Streaming...' : 'Paused'}
            </div>
          </div>
        </div>
        
        <div className="camera-overlay">
          🚗 {camera.vehicles} vehicles detected
        </div>
      </div>
      
      <div style={{
        padding: '1rem 1.5rem',
        background: 'var(--bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
          Camera ID: CAM-{camera.id.toString().padStart(3, '0')}
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setPlaying(!playing)}
          style={{padding: '0.5rem 1rem'}}
        >
          {playing ? <FiPause /> : <FiPlay />}
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{fontSize: '2rem', fontWeight: '700'}}>Live Camera Feeds</h1>
          <div style={{display: 'flex', gap: '1rem'}}>
            <select className="filter-select">
              <option>All Cameras</option>
              <option>With Emergencies</option>
              <option>High Traffic</option>
            </select>
            <button className="btn btn-primary">
              <FiMaximize />
              Full Screen
            </button>
          </div>
        </div>

        <div className="camera-grid">
          {cameras.map(camera => (
            <CameraFeed key={camera.id} camera={camera} />
          ))}
        </div>

        <div style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem'
        }}>
          <button className="btn btn-secondary">Load More Cameras</button>
        </div>
      </div>
    </div>
  );
};

export default CameraPage;