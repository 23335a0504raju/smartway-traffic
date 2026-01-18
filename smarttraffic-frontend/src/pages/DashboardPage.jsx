import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiFileText, FiTrendingUp, FiTruck, FiX } from 'react-icons/fi';
import StatsCard from '../components/Dashboard/StatsCard';
import { TrafficFlowChart } from '../components/Dashboard/TrafficChart';
import { supabase } from '../lib/supabaseClient';

// --- Modal Component ---
const VideoDetailsModal = ({ video, onClose }) => {
  const [report, setReport] = useState("Loading AI Analysis...");
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (video?.id) {
      // Fetch the corresponding Traffic Log to get the AI text
      supabase
        .from('traffic_logs')
        .select('detailed_analysis, snapshot_url')
        .eq('video_id', video.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        .then(({ data, error }) => {
          if (data?.detailed_analysis?.ai_report) {
            setReport(data.detailed_analysis.ai_report);
          } else {
            setReport("No AI Report available for this video.");
          }
          if (data?.snapshot_url) {
            setSnapshot(data.snapshot_url);
          }
        });
    }
  }, [video]);

  if (!video) return null;

  const summary = video.analysis_summary || {};
  const totalVehicles = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-scale-up">

        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-start sticky top-0 bg-[var(--bg-card)] z-10 w-full">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FiFileText className="text-[var(--primary)]" />
              Analysis Report
            </h2>
            <p className="text-[var(--text-secondary)] mt-1">{video.filename}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-primary)] rounded-full transition-colors">
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Snapshot Image */}
          {snapshot && (
            <div className="rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
              <img
                src={`http://localhost:5000/api/snapshots/${snapshot.split(/[/\\]/).pop()}`}
                alt="Traffic Snapshot"
                className="w-full h-auto object-cover max-h-64"
              />
            </div>
          )}

          {/* AI Report Section */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500 mb-2 flex items-center gap-2">
              <FiCpu /> GPT-4 Vision Analysis
            </h3>
            <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap text-sm">
              {report}
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--bg-primary)] rounded-xl text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-1">Total Count</div>
              <div className="text-2xl font-bold text-[var(--primary)]">{totalVehicles}</div>
            </div>
            <div className="p-4 bg-[var(--bg-primary)] rounded-xl text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-1">Duration</div>
              <div className="text-2xl font-bold">-- s</div>
            </div>
            <div className="p-4 bg-[var(--bg-primary)] rounded-xl text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-1">Status</div>
              <div className="text-sm font-bold text-green-500 uppercase flex justify-center items-center gap-1">
                <FiCheckCircle /> {video.status}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-primary)] rounded-xl text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-1">Date</div>
              <div className="text-xs font-semibold">{new Date(video.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3 border-l-4 border-[var(--primary)] pl-3">Vehicle Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(summary).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center p-3 border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${type.toLowerCase().includes('emergency') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="capitalize font-medium">{type}</span>
                  </div>
                  <span className="font-bold text-lg">{count}</span>
                </div>
              ))}
              {Object.keys(summary).length === 0 && (
                <p className="text-[var(--text-secondary)] col-span-2 text-center py-4">No analysis data available yet.</p>
              )}
            </div>
          </div>

          {/* Emergency Alert Section */}
          {(JSON.stringify(summary).toLowerCase().includes('emergency') || JSON.stringify(summary).toLowerCase().includes('ambulance') || JSON.stringify(summary).toLowerCase().includes('firetruck')) && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-4">
              <FiAlertTriangle className="text-red-500 text-xl mt-1" />
              <div>
                <h4 className="font-bold text-red-500">Emergency Vehicles Detected</h4>
                <p className="text-sm text-[var(--text-secondary)]">Standard traffic flow was interrupted to prioritize emergency response.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)]/50 text-center sticky bottom-0 w-full">
          <button onClick={onClose} className="btn btn-primary w-full md:w-auto px-8">Close Report</button>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = ({ aiMode }) => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    emergencies: 0,
    avgFlow: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);

  // New State for Videos
  const [recentVideos, setRecentVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentVideos();

    // Real-time subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'traffic_logs' },
        (payload) => {
          handleNewLog(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentVideos = async () => {
    // Fetch processed videos from backend/DB for the list
    try {
      const res = await fetch('http://localhost:5000/api/videos');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecentVideos(data.slice(0, 5)); // Show top 5
      }
    } catch (err) {
      console.error("Failed to fetch videos", err);
    }
  };

  const fetchDashboardData = async () => {
    // 1. Fetch Logs
    const { data: logs, error } = await supabase
      .from('traffic_logs')
      .select('vehicle_count, emergency_detected, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !logs) return;

    // 2. Stats Logic (Snapshot of recent activity)
    const totalVehicles = logs.reduce((acc, log) => acc + (log.vehicle_count || 0), 0);
    const emergencyCount = logs.filter(log => log.emergency_detected).length;

    setStats({
      totalVehicles: totalVehicles,
      emergencies: emergencyCount,
      avgFlow: Math.round(totalVehicles / (logs.length || 1)) // Avoid div by zero
    });

    // 3. Chart Data Transformation (Oldest -> Newest)
    const reversedLogs = [...logs].reverse();
    const newChartData = reversedLogs.map(log => ({
      time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      vehicles: log.vehicle_count,
      congestion: Math.min((log.vehicle_count * 5), 100) // Mock congestion metric (cap at 100)
    }));
    setChartData(newChartData);

    // 4. Alerts Logic
    const emergencyLogs = logs
      .filter(log => log.emergency_detected)
      .slice(0, 5)
      .map(log => ({
        type: 'critical',
        title: 'Emergency Vehicle Detected',
        message: `Ambulance/Fire detected with ${log.vehicle_count} other vehicles.`,
        time: new Date(log.created_at).toLocaleTimeString()
      }));

    if (emergencyLogs.length === 0) {
      setAlerts([{
        type: 'info',
        title: 'System Normal',
        message: 'No recent emergency vehicles detected.',
        time: 'Just now'
      }]);
    } else {
      setAlerts(emergencyLogs);
    }
  };

  const handleNewLog = (newLog) => {
    // Update Stats
    setStats(prev => ({
      ...prev,
      totalVehicles: prev.totalVehicles + (newLog.vehicle_count || 0),
      emergencies: prev.emergencies + (newLog.emergency_detected ? 1 : 0)
    }));

    // Update Alerts
    if (newLog.emergency_detected) {
      const newAlert = {
        type: 'critical',
        title: 'Emergency Vehicle Detected',
        message: `Ambulance/Fire detected with ${newLog.vehicle_count} other vehicles.`,
        time: new Date(newLog.created_at).toLocaleTimeString()
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    }

    // Update Chart
    setChartData(prev => {
      const newEntry = {
        time: new Date(newLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        vehicles: newLog.vehicle_count,
        congestion: Math.min(((newLog.vehicle_count || 0) * 5), 100)
      };
      const newData = [...prev, newEntry];
      if (newData.length > 20) newData.shift(); // Keep window size 20
      return newData;
    });
  };

  const handleOverride = async (junctionId, action) => {
    try {
      console.log(`Setting ${junctionId} to ${action}`);
      const response = await fetch('http://localhost:5000/api/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ junction_id: junctionId, action }),
      });

      if (!response.ok) throw new Error('Override failed');
      const data = await response.json();
      console.log('Override Success:', data);
    } catch (err) {
      console.error('Manual Override Error:', err);
      alert('Failed to send command. Check Backend connection.');
    }
  };

  return (
    <div className="dashboard fade-in">
      {/* Modal */}
      {selectedVideo && <VideoDetailsModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}

      <div className="dashboard-header">
        <h1 className="dashboard-title">Traffic Dashboard</h1>
        <div style={{
          padding: '0.5rem 1rem',
          background: aiMode ? 'var(--success)' : 'var(--warning)',
          color: 'white',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          {aiMode ? '🤖 AI Mode Active' : '👤 Manual Control'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatsCard
          title="Recent Vehicles Tracked"
          value={stats.totalVehicles.toLocaleString()}
          change={12}
          icon={<FiTruck />}
          color="primary"
        />
        <StatsCard
          title="Recent Emergencies"
          value={stats.emergencies}
          change={stats.emergencies > 0 ? 100 : 0}
          icon={<FiAlertTriangle />}
          color="danger"
        />
        <StatsCard
          title="Avg. Traffic Density"
          value={`${stats.avgFlow}`}
          change={-2}
          icon={<FiTrendingUp />}
          color="success"
        />
        <StatsCard
          title="Avg. Wait Time"
          value="-- s"
          change={0}
          icon={<FiClock />}
          color="accent"
        />
      </div>

      {/* Manual Override Control Panel */}
      <div className="card mb-8">
        <div className="card-header flex justify-between items-center">
          <h3 className="card-title">🚥 Signal Control Center</h3>
          <span className="text-xs text-[var(--text-secondary)]">Force override signals in case of sensor failure</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          {['J-01', 'J-02', 'J-03', 'J-04'].map((tmID) => (
            <div key={tmID} className="p-4 border border-[var(--border)] rounded-lg text-center bg-[var(--bg-primary)]">
              <div className="font-bold mb-3">{tmID}</div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleOverride(tmID, 'green')}
                  className="px-3 py-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white transition-colors text-sm font-bold"
                >
                  GREEN
                </button>
                <button
                  onClick={() => handleOverride(tmID, 'red')}
                  className="px-3 py-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors text-sm font-bold"
                >
                  RED
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">

        {/* Recent Analysis List (NEW) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent AI Analysis</h3>
          </div>
          <div className="p-4 space-y-3">
            {recentVideos.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm">No recent videos analyzed.</p>
            ) : (
              recentVideos.map(video => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--bg-primary)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                      <FiFileText size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm group-hover:text-blue-500 transition-colors">{video.filename}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{new Date(video.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {video.analysis_summary && (
                    <div className="text-right">
                      <span className="text-xs font-bold bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">Processed</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Traffic Real-time Flow</h3>
          </div>
          <TrafficFlowChart data={chartData} />
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">Recent Alerts</h3>
        </div>
        <div className="alerts-panel">
          {alerts.map((alert, index) => (
            <div key={index} className="alert-item">
              <div className={`alert-icon ${alert.type}`}>
                <FiAlertTriangle />
              </div>
              <div className="alert-content">
                <div className="alert-title">{alert.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {alert.message}
                </div>
              </div>
              <div className="alert-time">{alert.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;