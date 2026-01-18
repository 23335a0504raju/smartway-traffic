import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiInfo, FiRefreshCcw } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';

const AlertsPage = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alert_messages')
        .select(`
                *,
                videos (
                    filename,
                    road_name,
                    city,
                    analysis_summary,
                    traffic_logs (
                        detailed_analysis
                    )
                )
            `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform logs to alerts format
      const formattedAlerts = data.map(alert => ({
        id: alert.id,
        type: alert.type || 'System',
        severity: alert.type === 'Emergency' ? 'critical' : 'high',
        location: alert.videos?.road_name || alert.videos?.city || 'Unknown Location',
        description: alert.message,
        // Find the first VALID report (excluding errors/failures)
        html_report: alert.videos?.traffic_logs?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .find(l => {
            // Handle new string format AND old object format
            const reportContent = typeof l.detailed_analysis === 'string' ? l.detailed_analysis : l.detailed_analysis?.ai_report;
            return reportContent && !reportContent.includes("Analysis Failed") && !reportContent.includes("Error");
          })?.detailed_analysis, // This will be processed by the display logic (string or object)
        // Fallbacks from video summary if log not found
        fallback_report: alert.videos?.analysis_summary?.ai_report || alert.videos?.analysis_summary?.html_report,
        time: alert.created_at,
        status: 'active'
      }));

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' || alert.status === filter;
    const matchesSearch = alert.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <FiAlertTriangle style={{ color: 'var(--danger)' }} />;
      case 'high': return <FiAlertTriangle style={{ color: 'var(--warning)' }} />;
      case 'medium': return <FiInfo style={{ color: 'var(--accent)' }} />;
      case 'low': return <FiInfo style={{ color: 'var(--primary)' }} />;
      default: return <FiInfo />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'resolved': return 'status-resolved';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  return (
    <div className="alerts-container fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Alerts & Notifications</h1>
        <button className="btn btn-primary" onClick={fetchAlerts}>
          <FiRefreshCcw /> Refresh
        </button>
      </div>

      {/* Filters (Simplified for now) */}
      <div className="alerts-filters">
        <input
          type="text"
          placeholder="Search alerts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-select"
          style={{ flex: 1 }}
        />
        {/* ... (Other filters can remain statically if desired or removed) ... */}
      </div>

      {/* Alerts Table */}
      <div className="alerts-table">
        <div className="table-header">
          <div>Type & Severity</div>
          <div>Location</div>
          <div>Description</div>
          <div>Time</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">No active alerts found.</div>
        ) : (
          filteredAlerts.map(alert => (
            <div key={alert.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
              {/* Main Row */}
              <div
                className="p-4 grid grid-cols-[auto_1fr_2fr_1fr_auto] gap-4 items-center cursor-pointer"
                onClick={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
              >
                <div className="flex items-center gap-2 w-32">
                  {getSeverityIcon(alert.severity)}
                  <div>
                    <div className="font-bold">{alert.type}</div>
                    <div className="text-xs text-gray-400 uppercase">{alert.severity}</div>
                  </div>
                </div>

                <div className="font-semibold">{alert.location}</div>

                <div className="text-gray-300 truncate">{alert.description}</div>

                <div>
                  <div className="font-semibold">{new Date(alert.time).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-400">{new Date(alert.time).toLocaleTimeString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${alert.status === 'active' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
                    }`}>
                    {alert.status}
                  </span>
                  <FiInfo className={`ml-2 transition-transform ${expandedAlertId === alert.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAlertId === alert.id && (
                <div className="p-4 bg-gray-900/50 border-t border-gray-700 animate-in fade-in slide-in-from-top-2">
                  {alert.html_report && (typeof alert.html_report === 'string' || typeof alert.html_report === 'object') ? (
                    <div>
                      <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                        <FiAlertTriangle /> Full Forensic Report
                      </h4>
                      <div
                        className="text-sm text-gray-300 space-y-2 report-content"
                        dangerouslySetInnerHTML={{
                          __html: typeof alert.html_report === 'string' ? alert.html_report : (alert.html_report.ai_report || "Report format error")
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No detailed report available for this alert.</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPage;