import { useEffect, useState } from 'react';
import { FiCalendar, FiFileText, FiVideo } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';

const HistoryPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            // Join traffic_logs with videos table
            const { data, error } = await supabase
                .from('traffic_logs')
                .select(`
                    *,
                    videos (
                        filename
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLogs(data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto fade-in">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <FiFileText /> Analysis History
            </h1>

            {loading ? (
                <div className="text-center py-10">Loading history...</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No analysis logs found.</div>
            ) : (
                <div className="grid gap-6">
                    {logs.map((log) => (
                        <div key={log.id} className="card p-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border)] pb-4">
                                <div>
                                    <div className="flex items-center gap-2 text-xl font-bold text-[var(--primary)]">
                                        <FiVideo />
                                        {log.videos?.filename || 'Unknown Video'}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mt-1">
                                        <span className="flex items-center gap-1"><FiCalendar /> {formatDate(log.created_at)}</span>
                                    </div>
                                </div>
                                <div className={`px-4 py-1 rounded-full text-sm font-bold ${log.emergency_detected ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                    {log.emergency_detected ? 'EMERGENCY DETECTED' : 'Normal Flow'}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Snapshot Column */}
                                {log.snapshot_url && (
                                    <div className="mb-4 md:mb-0">
                                        <h4 className="font-bold text-[var(--text-secondary)] mb-2 uppercase text-xs tracking-wider">Event Snapshot</h4>
                                        <img
                                            src={`http://localhost:5000/api/snapshots/${log.snapshot_url.split(/[/\\]/).pop()}`}
                                            alt="Event Snapshot"
                                            className="w-full h-48 object-cover rounded-lg border border-[var(--border)]"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                )}

                                {/* Detailed Counts Block (User Request) */}
                                <div className={log.snapshot_url ? "" : "md:col-span-2"}>
                                    <h4 className="font-bold text-[var(--text-secondary)] mb-2 uppercase text-xs tracking-wider">Analysis Data</h4>
                                    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs uppercase bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                                <tr>
                                                    <th className="px-4 py-2">Vehicle Type</th>
                                                    <th className="px-4 py-2 text-right">Count</th>
                                                </tr>
                                            </thead>
                                            <tbody>

                                                {Object.entries(log.analysis_data || {})
                                                    .filter(([key]) => !['ai_report', 'alerts', 'lane_data', 'signals', 'ai_summary_text'].includes(key))
                                                    .map(([key, value]) => {
                                                        // Skip objects/arrays to avoid JSON dumping
                                                        if (typeof value === 'object' && value !== null) return null;

                                                        return (
                                                            <tr key={key} className="border-b border-[var(--border)] last:border-none hover:bg-[var(--bg-secondary)]">
                                                                <td className="px-4 py-2 font-medium capitalize">{key.replace(/_/g, ' ')}</td>
                                                                <td className="px-4 py-2 text-right font-mono font-bold text-[var(--primary)]">
                                                                    {value}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* AI Report Text */}
                                <div className="md:col-span-2 mt-4 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
                                    <h4 className="font-bold text-[var(--text-secondary)] mb-2 uppercase text-xs tracking-wider border-b border-[var(--border)] pb-2">AI Report Summary</h4>


                                    {(() => {
                                        // 1. Direct String (New Format)
                                        if (log.detailed_analysis && typeof log.detailed_analysis === 'string') {
                                            return (
                                                <div
                                                    className="report-content text-sm space-y-2 text-[var(--text-primary)]"
                                                    dangerouslySetInnerHTML={{ __html: log.detailed_analysis }}
                                                />
                                            );
                                        }
                                        // 2. Object with ai_report key (Legacy/Fallback)
                                        else if (log.detailed_analysis && typeof log.detailed_analysis === 'object' && log.detailed_analysis.ai_report) {
                                            return (
                                                <div
                                                    className="report-content text-sm space-y-2 text-[var(--text-primary)]"
                                                    dangerouslySetInnerHTML={{ __html: log.detailed_analysis.ai_report }}
                                                />
                                            );
                                        }
                                        // 3. Fallback
                                        else {
                                            return <p className="text-[var(--text-secondary)] italic">No detailed report available.</p>;
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
