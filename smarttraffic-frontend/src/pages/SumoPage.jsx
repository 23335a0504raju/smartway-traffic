import { useEffect, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCpu, FiPlay, FiStopCircle } from 'react-icons/fi';

const SumoPage = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Poll for status
    useEffect(() => {
        const interval = setInterval(() => {
            fetch('http://localhost:8000/api/sumo/status')
                .then(res => res.json())
                .then(data => setStatus(data))
                .catch(err => {
                    // console.error("Poll error", err); 
                    // Silent fail if sim not running/server down
                });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handleStart = async () => {
        setLoading(true);
        setError(null);
        try {
            await fetch('http://localhost:8000/api/sumo/start', { method: 'POST' });
        } catch (err) {
            setError("Failed to start simulation. Ensure 'python main.py' is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        try {
            await fetch('http://localhost:8000/api/sumo/stop', { method: 'POST' });
        } catch (err) {
            console.error(err);
        }
    };

    // calculate total density
    const totalVehicles = status?.lane_counts
        ? Object.values(status.lane_counts).reduce((a, b) => a + b, 0)
        : 0;

    return (
        <div className="container mx-auto p-6 text-white min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    SUMO Traffic Control
                </h1>
                <p className="text-gray-400 mt-2">Real-time Intersection Simulation & Adaptive Control</p>
            </header>

            {error && (
                <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-6 flex items-center gap-3">
                    <FiAlertTriangle className="text-red-500" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Visualizer Placeholder */}
                <div className="lg:col-span-2">
                    <div className="aspect-video bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden">
                        {/* Simple CSS Intersection Visualization */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <div className="w-20 h-full bg-gray-700"></div> {/* NS Road */}
                            <div className="h-20 w-full bg-gray-700 absolute"></div> {/* WE Road */}
                        </div>

                        {status?.running ? (
                            <div className="text-center z-10">
                                <div className="text-6xl mb-4">🚦</div>
                                <h3 className="text-2xl font-bold text-green-400">Simulation Running</h3>
                                <p className="text-gray-400">View the popup "SUMO GUI" window for live 3D view.</p>
                                <p className="mt-4 text-sm text-[var(--accent)]">Step: {status.step}</p>
                            </div>
                        ) : (
                            <div className="text-center z-10 text-gray-500">
                                <FiCpu size={48} className="mx-auto mb-4" />
                                <p>Simulation Stopped</p>
                            </div>
                        )}

                        {/* Overlay: Emergency Alert */}
                        {status?.emergency_active && (
                            <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-4 rounded-xl animate-pulse flex justify-between items-center shadow-lg">
                                <span className="font-bold flex items-center gap-2"><FiAlertTriangle /> EMERGENCY DETECTED</span>
                                <span className="text-xs bg-white text-red-600 px-2 py-1 rounded">PRIORITY MODE ACTIVE</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="mt-6 flex gap-4">
                        {!status?.running ? (
                            <button
                                onClick={handleStart}
                                disabled={loading}
                                className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/20"
                            >
                                {loading ? "Starting..." : <><FiPlay /> Start Simulation</>}
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                            >
                                <FiStopCircle /> Stop Simulation
                            </button>
                        )}
                    </div>
                </div>

                {/* Metrics Panel */}
                <div className="space-y-6">
                    {/* Density Card */}
                    <div className="card p-6">
                        <h3 className="card-title mb-4"><FiActivity /> Real-time Density</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--bg-primary)] p-4 rounded-lg">
                                <div className="text-xs text-gray-400">North-South</div>
                                <div className="text-2xl font-mono font-bold text-blue-400">
                                    {(status?.lane_counts?.E0_0 || 0) + (status?.lane_counts?.E2_0 || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Vehicles</div>
                            </div>
                            <div className="bg-[var(--bg-primary)] p-4 rounded-lg">
                                <div className="text-xs text-gray-400">West-East</div>
                                <div className="text-2xl font-mono font-bold text-purple-400">
                                    {(status?.lane_counts?.E1_0 || 0) + (status?.lane_counts?.E3_0 || 0)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Vehicles</div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Total Intersection Load</span>
                                <span className="font-bold">{totalVehicles}</span>
                            </div>
                            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${totalVehicles > 20 ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(totalVehicles * 2, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Logic Explained */}
                    <div className="card p-6 border border-blue-500/30 bg-blue-900/10">
                        <h3 className="card-title text-blue-400 mb-2">Algorithm Logic</h3>
                        <ul className="text-xs space-y-2 text-gray-300 list-disc pl-4">
                            <li><b className="text-white">Density Estimation:</b> Counting vehicles on incoming lanes (E0-E3) via TraCI (simulating CV).</li>
                            <li><b className="text-white">EfficientDet Integration:</b> Simulated by strictly classifying "ambulance" types in the flow.</li>
                            <li><b className="text-white">Adaptive Control:</b> Green light duration extends for the road with higher density.</li>
                            <li><b className="text-white">Priority Override:</b> If ambulance detected (Red Alert), immediate green phase for that lane.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SumoPage;
