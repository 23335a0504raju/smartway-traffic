import { useEffect, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCpu, FiFile, FiUploadCloud, FiClock, FiCheckCircle } from 'react-icons/fi';
import SumoVisualizer from '../components/SumoVisualizer';

const SumoPage = () => {
    const [status, setStatus] = useState('idle'); // idle, uploading, analyzed, error
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [analysisData, setAnalysisData] = useState(null);
    const [liveTelemetry, setLiveTelemetry] = useState(null);
    
    // UI State
    const [selectedJunction, setSelectedJunction] = useState('');
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/sumo/sessions`);
            const data = await res.json();
            if (Array.isArray(data)) setSessions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setStatus('uploading');
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/sumo/analyze`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setAnalysisData(data.analysis);
            setSelectedJunction(Object.keys(data.analysis.junction_data)[0]);
            setStatus('analyzed');
            fetchSessions();
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleViewSession = (session) => {
        let parsedJunctionData = session.junction_data;
        let parsedVehicleSummary = session.vehicle_summary;
        
        try { if (typeof parsedJunctionData === 'string') parsedJunctionData = JSON.parse(parsedJunctionData); } catch(e){}
        try { if (typeof parsedVehicleSummary === 'string') parsedVehicleSummary = JSON.parse(parsedVehicleSummary); } catch(e){}

        setAnalysisData({
            network_name: session.network_name,
            junction_count: session.junction_count,
            total_vehicles_simulated: session.total_vehicles,
            emergency_detected: session.emergency_detected,
            vehicle_summary: parsedVehicleSummary,
            junction_data: parsedJunctionData
        });
        if (parsedJunctionData && Object.keys(parsedJunctionData).length > 0) {
            setSelectedJunction(Object.keys(parsedJunctionData)[0]);
        }
        setLiveTelemetry(null);
        setStatus('analyzed');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container mx-auto p-6 text-white min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    SUMO Traffic Simulation
                </h1>
                <p className="text-gray-400 mt-2">Upload a SUMO XML model archive (.zip) for headless AI analysis</p>
            </header>

            {error && (
                <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <FiAlertTriangle className="text-red-500" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Upload & History */}
                <div className="space-y-6">
                    {/* Upload Card */}
                    <div className="card p-6 border border-gray-700 bg-gray-900/50">
                        <h3 className="card-title mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            1. Upload Module
                        </h3>
                        <form onSubmit={handleUpload}>
                            <div className="border-2 border-dashed border-gray-600 p-6 rounded-xl text-center cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all relative group">
                                <input
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    required
                                />
                                <FiUploadCloud size={40} className="mx-auto mb-2 text-gray-400 group-hover:text-blue-400 transition-colors" />
                                {file ? (
                                    <p className="text-blue-400 font-semibold">{file.name}</p>
                                ) : (
                                    <>
                                        <p className="font-semibold text-gray-300">Drop SUMO .zip here</p>
                                        <p className="text-xs text-gray-500 mt-1">Must contain network.net.xml & traffic.rou.xml</p>
                                    </>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={status === 'uploading' || !file}
                                className={`w-full mt-4 py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${
                                    status === 'uploading' || !file ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                }`}
                            >
                                {status === 'uploading' ? (
                                    <><FiActivity className="animate-spin" /> Simulating Traffic flows...</>
                                ) : (
                                    <><FiCpu /> Run Headless Analysis</>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* History Panel */}
                    <div className="card p-4 border border-gray-800 bg-gray-900/30 overflow-y-auto max-h-[500px]">
                        <h3 className="text-gray-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                            <FiClock /> Past Sessions
                        </h3>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">No sessions yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {sessions.map(s => (
                                    <div 
                                        key={s.id} 
                                        className="p-3 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg cursor-pointer transition-colors"
                                        onClick={() => handleViewSession(s)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-semibold text-sm line-clamp-1 flex items-center gap-2">
                                                <FiFile className="text-blue-400"/> {s.network_name}
                                            </div>
                                            {s.emergency_detected && (
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1 shrink-0"></span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                            <div className="text-xs text-gray-500">
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs font-mono font-bold text-gray-300 bg-gray-900 px-2 py-0.5 rounded">
                                                {s.total_vehicles} veh • {s.junction_count} Jcts
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Results Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Results View */}
                    <div className="relative">
                        {status === 'idle' ? (
                            <div className="card h-[400px] flex flex-col items-center justify-center border border-gray-800 text-gray-500">
                                <FiCpu size={64} className="mb-4 opacity-20" />
                                <p className="text-xl font-medium">No active simulation</p>
                                <p className="text-sm mt-2 opacity-70">Upload a model to see junction analysis</p>
                            </div>
                        ) : analysisData ? (
                            <>
                                {/* Live Visualizer or Historical Placeholder */}
                                {analysisData.geometry && analysisData.vehicles ? (
                                    <div className="mb-6">
                                        {/* Fixed Height Header Container (Zero Layout Shift) */}
                                        <div className="relative h-12 mb-4">
                                            {/* Normal Header */}
                                            <h3 className={`absolute inset-0 text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent transition-opacity duration-300 flex items-center ${liveTelemetry?.nsEmergency || liveTelemetry?.weEmergency ? 'opacity-0' : 'opacity-100'}`}>
                                                Live Simulation View
                                            </h3>
                                            
                                            {/* Compact Emergency Banner */}
                                            <div className={`absolute inset-0 bg-red-950/80 backdrop-blur-md border border-red-500/70 px-4 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.25)] transition-all duration-300 flex items-center justify-between ${liveTelemetry?.nsEmergency || liveTelemetry?.weEmergency ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}`}>
                                                <div className="flex items-center gap-3">
                                                    <FiAlertTriangle className="text-red-500 animate-pulse" size={20} />
                                                    <h3 className="font-bold text-red-400 uppercase text-sm tracking-wide">
                                                        Emergency Detected: {liveTelemetry?.nsEmergency && liveTelemetry?.weEmergency ? 'Multiple Axes' : liveTelemetry?.nsEmergency ? 'North-South Axis' : 'West-East Axis'}
                                                    </h3>
                                                </div>
                                                <span className="text-xs text-red-300/80 hidden sm:block">Dynamic priority route override active</span>
                                            </div>
                                        </div>
                                        <SumoVisualizer 
                                            geometry={analysisData.geometry} 
                                            vehicles={analysisData.vehicles} 
                                            junctions={analysisData.junction_data}
                                            onTelemetry={setLiveTelemetry} 
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-6 card p-10 bg-gray-800/40 border border-gray-700 flex flex-col items-center justify-center text-center">
                                        <FiActivity size={48} className="text-blue-500 mb-4 opacity-40" />
                                        <h3 className="text-xl font-bold text-gray-200 mb-2">Historical Session Log</h3>
                                        <p className="text-sm text-gray-400 max-w-md">You are viewing the final aggregated metrics from a previously simulated network. The geometry tracking and live physics replay module is unavailable for archived analysis instances.</p>
                                    </div>
                                )}

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="card p-4 bg-gray-800/30">
                                    <div className="text-xs text-gray-400 mb-1">Flow (Active / Simulated)</div>
                                    <div className="text-2xl font-bold font-mono text-emerald-400">{liveTelemetry?.activeCount || 0} <span className="text-gray-500 text-lg">/ {analysisData.total_vehicles_simulated}</span></div>
                                </div>
                                <div className="card p-4 bg-gray-800/30">
                                    <div className="text-xs text-gray-400 mb-1">Monitored Junctions</div>
                                    <div className="text-2xl font-bold font-mono">{analysisData.junction_count}</div>
                                </div>
                                <div className="card p-4 bg-gray-800/30 col-span-2 border border-blue-900/50">
                                    <div className="text-xs text-blue-400 mb-2 font-bold uppercase tracking-wider">Live Viewport Vehicle Mix</div>
                                    <div className="flex gap-4">
                                        {Object.entries(liveTelemetry ? liveTelemetry.liveComposition : analysisData.vehicle_summary).map(([type, count]) => (
                                            <div key={type}>
                                                <div className="text-[10px] text-gray-500 capitalize">{type}</div>
                                                <div className="font-mono text-sm">{count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Junction Analysis Panel */}
                            <div className="card border border-gray-700 p-0 overflow-hidden">
                                <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <FiActivity className="text-green-400" /> Junction Telemetry
                                    </h3>
                                    
                                    {/* Tabs for Junctions */}
                                    <div className="flex gap-2 p-1 bg-gray-900 rounded-lg overflow-x-auto max-w-full">
                                        {Object.keys(analysisData.junction_data).map(jid => (
                                            <button
                                                key={jid}
                                                onClick={() => setSelectedJunction(jid)}
                                                className={`px-4 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors ${
                                                    selectedJunction === jid 
                                                        ? 'bg-blue-600 text-white shadow' 
                                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                                }`}
                                            >
                                                {jid}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedJunction && analysisData.junction_data[selectedJunction] && (
                                    <div className="p-6">
                                        {/* Visualization Grid */}
                                        <div className="grid md:grid-cols-2 gap-8">
                                            
                                            {/* Left: Intersection Load */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-700 pb-2">Directional Load</h4>
                                                
                                                <div className="space-y-6">
                                                    {/* NS Bar */}
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>North-South Lanes</span>
                                                            <span className="font-mono">{liveTelemetry ? liveTelemetry.nsCount : analysisData.junction_data[selectedJunction].lane_density.NS_vehicles} veh</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, ((liveTelemetry ? liveTelemetry.nsCount : analysisData.junction_data[selectedJunction].lane_density.NS_vehicles) / 100) * 100)}%` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* WE Bar */}
                                                    <div>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span>West-East Lanes</span>
                                                            <span className="font-mono">{liveTelemetry ? liveTelemetry.weCount : analysisData.junction_data[selectedJunction].lane_density.WE_vehicles} veh</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${Math.min(100, ((liveTelemetry ? liveTelemetry.weCount : analysisData.junction_data[selectedJunction].lane_density.WE_vehicles) / 100) * 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-6">
                                                    <h5 className="text-xs text-gray-500 mb-2">Simulated Composition</h5>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.entries(liveTelemetry ? liveTelemetry.liveComposition : analysisData.junction_data[selectedJunction].vehicle_counts).map(([type, count]) => (
                                                            count > 0 && (
                                                                <span key={type} className="px-2 py-1 bg-gray-800 rounded text-xs capitalize text-gray-300 border border-gray-700">
                                                                    {type}: <span className="font-mono text-white">{count}</span>
                                                                </span>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Signal Timings */}
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-700 pb-2">AI Optimal Timings</h4>
                                                
                                                <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative overflow-hidden">
                                                    {(liveTelemetry?.nsEmergency || liveTelemetry?.weEmergency) && (
                                                        <div className="absolute top-0 right-0 bg-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Priority Override Active</div>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {/* NS Signal */}
                                                        <div className="text-center">
                                                            <div className="w-12 h-32 bg-gray-950 rounded-full mx-auto border-2 border-gray-800 flex flex-col items-center justify-between py-2 shadow-inner">
                                                                <div className={`w-8 h-8 rounded-full ${!liveTelemetry?.phase?.includes('NS_') ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-red-900/50'}`}></div>
                                                                <div className={`w-8 h-8 rounded-full ${liveTelemetry?.phase === 'NS_YELLOW' ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : 'bg-yellow-900/50'}`}></div>
                                                                <div className={`w-8 h-8 rounded-full ${liveTelemetry?.phase === 'NS_GREEN' ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-green-900/50'}`}></div>
                                                            </div>
                                                            <div className="mt-3 font-bold text-sm">North-South</div>
                                                            <div className={`font-mono text-2xl font-bold ${liveTelemetry?.phase?.includes('NS_') ? 'text-green-400' : 'text-gray-600'}`}>
                                                                {(() => {
                                                                    if (!liveTelemetry?.phase?.includes('NS_')) return 'WAIT';
                                                                    if (liveTelemetry.nsEmergency || liveTelemetry.weEmergency) return 'PRIO';
                                                                    const defaultTime = analysisData.junction_data[selectedJunction].signals.ns_green_secs || 90;
                                                                    const remaining = Math.max(0, defaultTime - liveTelemetry.timer);
                                                                    if (remaining === 0) return `+${Math.floor(liveTelemetry.timer - defaultTime)}s`;
                                                                    return `${Math.ceil(remaining)}s`;
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* WE Signal */}
                                                        <div className="text-center">
                                                            <div className="w-12 h-32 bg-gray-950 rounded-full mx-auto border-2 border-gray-800 flex flex-col items-center justify-between py-2 shadow-inner">
                                                                <div className={`w-8 h-8 rounded-full ${!liveTelemetry?.phase?.includes('WE_') ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-red-900/50'}`}></div>
                                                                <div className={`w-8 h-8 rounded-full ${liveTelemetry?.phase === 'WE_YELLOW' ? 'bg-yellow-400 shadow-[0_0_15px_#facc15]' : 'bg-yellow-900/50'}`}></div>
                                                                <div className={`w-8 h-8 rounded-full ${liveTelemetry?.phase === 'WE_GREEN' ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-green-900/50'}`}></div>
                                                            </div>
                                                            <div className="mt-3 font-bold text-sm">West-East</div>
                                                            <div className={`font-mono text-2xl font-bold ${liveTelemetry?.phase?.includes('WE_') ? 'text-green-400' : 'text-gray-600'}`}>
                                                                {(() => {
                                                                    if (!liveTelemetry?.phase?.includes('WE_')) return 'WAIT';
                                                                    if (liveTelemetry.nsEmergency || liveTelemetry.weEmergency) return 'PRIO';
                                                                    const defaultTime = analysisData.junction_data[selectedJunction].signals.we_green_secs || 10;
                                                                    const remaining = Math.max(0, defaultTime - liveTelemetry.timer);
                                                                    if (remaining === 0) return `+${Math.floor(liveTelemetry.timer - defaultTime)}s`;
                                                                    return `${Math.ceil(remaining)}s`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
                                                        Driven organically by the Canvas Physics Automaton matching Live Lane Density metrics.
                                                    </p>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SumoPage;
