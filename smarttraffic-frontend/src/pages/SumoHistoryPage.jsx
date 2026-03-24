import { useEffect, useState } from 'react';
import { FiArchive, FiCalendar, FiCpu, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';

const SumoHistoryPage = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSumoSessions();
    }, []);

    const fetchSumoSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('sumo_sessions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSessions(data || []);
        } catch (error) {
            console.error('Error fetching SUMO sessions:', error);
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
                <FiArchive className="text-blue-500" /> SUMO Simulation History
            </h1>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading SUMO history...</div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-xl border border-gray-800">
                    No SUMO simulations found. Upload a model in the SUMO Sim page to get started.
                </div>
            ) : (
                <div className="grid gap-6">
                    {sessions.map((session) => (
                        <div key={session.id} className="bg-[#1a1f2c] border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-blue-900/50 transition-colors">
                            {/* Header */}
                            <div className="bg-gray-900/80 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800">
                                <div>
                                    <div className="flex items-center gap-3 text-lg font-bold text-white">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                            <FiCpu />
                                        </div>
                                        {session.network_name}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-mono text-gray-400 mt-2">
                                        <span className="flex items-center gap-1.5"><FiCalendar /> {formatDate(session.created_at)}</span>
                                        <span className="px-2 py-0.5 bg-gray-800 rounded">ID: {session.session_id.split('-')[0]}</span>
                                    </div>
                                </div>
                                
                                {session.emergency_detected ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                                        <FiAlertTriangle /> EMERGENCY ROUTED
                                    </div>
                                ) : (
                                    <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                                        Normal Sim
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-5 grid md:grid-cols-3 gap-6">
                                {/* Global Stats */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Network Summary</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#131720] p-3 rounded-lg border border-gray-800/50">
                                            <div className="text-[10px] text-gray-500 mb-1">Total Flow</div>
                                            <div className="font-mono text-xl text-white">{session.total_vehicles}</div>
                                        </div>
                                        <div className="bg-[#131720] p-3 rounded-lg border border-gray-800/50">
                                            <div className="text-[10px] text-gray-500 mb-1">Junctions Analyzed</div>
                                            <div className="font-mono text-xl text-white">{session.junction_count}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle Mix */}
                                <div className="space-y-4 md:col-span-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Global Vehicle Mix</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(session.vehicle_summary || {}).map(([type, count]) => count > 0 && (
                                            <div key={type} className="flex items-center gap-3 bg-[#131720] px-4 py-2 rounded-lg border border-gray-800/50">
                                                <div className={`w-2 h-2 rounded-full ${type === 'ambulance' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                                                <div className="text-xs text-gray-400 capitalize">{type}</div>
                                                <div className="font-mono text-white text-sm font-bold">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SumoHistoryPage;
