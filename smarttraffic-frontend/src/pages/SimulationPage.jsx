import { useEffect, useRef, useState } from 'react';
import { FiActivity, FiAlertTriangle, FiLoader, FiPlay, FiSave, FiSquare, FiX } from 'react-icons/fi';

const SimulationPage = () => {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState('');
    const [currentVideoId, setCurrentVideoId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, running, completed, paused
    const [frameSrc, setFrameSrc] = useState(null);
    const [vehicleCounts, setVehicleCounts] = useState({});
    const [evtSource, setEvtSource] = useState(null);
    const [finalCounts, setFinalCounts] = useState(null);
    const [aiReport, setAiReport] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [snapshotPath, setSnapshotPath] = useState(null);
    const [isPaused, setIsPaused] = useState(false);

    const isPausedRef = useRef(false);
    const latestMetricsRef = useRef({}); // capture metadata stream

    // Sync ref with state
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        fetch('http://localhost:5000/api/videos')
            .then(res => res.json())
            .then(data => setVideos(data))
            .catch(err => console.error("Failed to load videos", err));
    }, []);

    // Auto-save when status becomes completed and we have data
    // Auto-save removed. Now manual.


    const handleStartSimulation = () => {
        if (!selectedVideo) return;
        setStatus('running');
        setFinalCounts(null);
        setAiReport(null);
        setIsSaved(false);
        latestMetricsRef.current = {}; // Reset metrics

        // Find video object to get filename
        const videoObj = videos.find(v => v.id === selectedVideo);
        if (!videoObj) return;

        setCurrentVideoId(videoObj.id);

        // Use 'filepath' (stored name on disk) not 'filename' (display name)
        startLiveDetection(videoObj.filepath);
    };

    const startLiveDetection = (filename) => {
        const source = new EventSource(`http://localhost:8000/api/live-detect-sse/?file=stored:${filename}`);
        setEvtSource(source);

        source.onopen = () => {

        };

        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.error) {
                    console.error("AI Error:", data.error);
                    source.close();
                    setStatus('idle');
                    alert(`AI Error: ${data.error}`);
                    return;
                }

                if (data.completed) {

                    source.close();
                    setEvtSource(null);
                    // setFrameSrc(null); // Keep the last frame visible (important for images)
                    setFinalCounts({
                        ...data.counts,
                        lane_data: data.lane_data,
                        signals: data.signals,
                        emergency: data.emergency,
                        calc_accident_type: data.accident_type,
                        calc_severity: data.severity
                    });
                    setSnapshotPath(data.snapshot_path || null);
                    setStatus('completed');
                } else {
                    if (!isPausedRef.current) {
                        setFrameSrc("data:image/jpeg;base64," + data.frame);
                        setVehicleCounts(data.counts || {});

                        // Capture Latest Metadata for Manual Stop
                        latestMetricsRef.current = {
                            emergency: data.emergency,
                            accident_type: data.accident_type,
                            severity: data.severity
                        };

                        // Capture snapshot path immediately if available
                        if (data.snapshot_path) {
                            setSnapshotPath(data.snapshot_path);
                        }
                    }
                }
            } catch (e) {
                console.error("SSE Parse Error", e);
            }
        };

        source.onerror = (err) => {
            // console.error("SSE Error", err);
            // source.close();
            // setStatus('idle');
        };
    };

    const handleStop = () => {
        isPausedRef.current = false;
        if (evtSource) {
            evtSource.close();
            setEvtSource(null);
        }
        // setFrameSrc(null); // Optional: decide if manual stop clears it. Let's keep it visible for result review.

        // Manual Stop: Merge counts with captured metadata
        setFinalCounts({
            ...vehicleCounts,
            emergency: latestMetricsRef.current.emergency,
            calc_accident_type: latestMetricsRef.current.accident_type,
            calc_severity: latestMetricsRef.current.severity
        });

        setStatus('completed');
    };

    const [saving, setSaving] = useState(false); // Add Loading State

    const handleSaveResults = () => {
        if (!currentVideoId || !finalCounts) return;

        setSaving(true); // Start Loading


        fetch(`http://localhost:5000/api/videos/${currentVideoId}/analysis`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                analysis_summary: finalCounts,
                snapshot_path: snapshotPath
            })
        })
            .then(res => res.json())
            .then(data => {
                setIsSaved(true);
                // Show the report modal immediately (Results Pop-up)
                if (data.ai_report) {
                    setAiReport(data.ai_report);
                } else {
                    setAiReport("No textual report generated.");
                }
            })
            .catch(err => {
                console.error("Failed to save", err);
                alert("Failed to save results. Check console.");
            })
            .finally(() => {
                setSaving(false); // Stop Loading
            });
    };

    const handleCancel = () => {
        if (evtSource) {
            evtSource.close();
            setEvtSource(null);
        }
        window.location.reload();
    };

    return (
        <div className="container mx-auto p-6 text-white min-h-screen">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Traffic Simulation
                    </h1>
                    <p className="text-gray-400 mt-2">Real-time AI detection and analysis</p>
                </div>

                {/* New Cancel Button */}
                {status === 'running' && (
                    <button
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-all"
                    >
                        <FiX /> Cancel Simulation
                    </button>
                )}
            </header>

            {/* Control Panel */}
            <div className="card p-6 mb-8 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Select Video Feed</label>
                    <select
                        className="w-full bg-[var(--bg-primary)] border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedVideo}
                        onChange={(e) => setSelectedVideo(e.target.value)}
                        disabled={status === 'running'}
                    >
                        <option value="">-- Choose a Surveillance Feed --</option>
                        {videos.map(v => (
                            <option key={v.id} value={v.id}>{v.filename} ({v.road_name || 'Unknown Road'})</option>
                        ))}
                    </select>
                </div>

                {status === 'idle' || status === 'completed' ? (
                    <button
                        onClick={handleStartSimulation}
                        disabled={!selectedVideo}
                        className={`px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${!selectedVideo ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                            }`}
                    >
                        <FiPlay /> Start Simulation
                    </button>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsPaused(!isPaused)}
                            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${isPaused ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isPaused ? <FiPlay /> : <FiActivity className="animate-pulse" />}
                            {isPaused ? "Resume" : "Pause"}
                        </button>

                        <button
                            onClick={handleStop}
                            className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-500/20"
                        >
                            <FiSquare /> Stop & View Results
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Viewport */}
                <div className="lg:col-span-2 relative aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                    {frameSrc ? (
                        <img src={frameSrc} alt="Live Feed" className="w-full h-full object-contain" />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                            <FiActivity size={48} className="mb-4 opacity-50" />
                            <p>Waiting for video stream...</p>
                        </div>
                    )}

                    {/* Overlay Stats */}
                    {frameSrc && (
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white p-4 rounded-xl border border-white/10">
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">Live Detections</h3>
                            <div className="space-y-1">
                                {Object.entries(vehicleCounts || {}).map(([type, count]) => (
                                    typeof count === 'number' && (
                                        <div key={type} className="flex justify-between w-32 text-sm">
                                            <span className="capitalize">{type}</span>
                                            <span className="font-mono font-bold text-blue-400">{count}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Panel (Stats) */}
                <div className="card p-6 flex flex-col gap-6 overflow-y-auto max-h-[600px]">
                    <div>
                        <h3 className="font-semibold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                            <FiActivity /> Simulation Metrics
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-[var(--bg-primary)] rounded-lg">
                                <div className="text-xs text-[var(--text-secondary)]">Total Vehicles</div>
                                <div className="text-2xl font-bold">
                                    {Object.values(vehicleCounts || {}).reduce((a, b) => typeof b === 'number' ? a + b : a, 0)}
                                </div>
                            </div>
                            <div className="p-4 bg-[var(--bg-primary)] rounded-lg">
                                <div className="text-xs text-[var(--text-secondary)]">Congestion</div>
                                <div className="text-2xl font-bold text-orange-500">
                                    {Object.values(vehicleCounts || {}).some(v => v > 15) ? 'High' : 'Normal'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {aiReport && (
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                            <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                <FiAlertTriangle /> AI Analysis Ready
                            </h4>
                            <p className="text-sm text-gray-300 line-clamp-3">
                                {aiReport.substring(0, 100)}...
                            </p>
                        </div>
                    )}

                </div>
            </div>

            {/* Results Modal */}
            {status === 'completed' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-900">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <FiSave className="text-green-500" /> Simulation Results
                                </h2>
                                <p className="text-green-400 text-sm mt-1">Data successfully saved to database</p>
                            </div>
                            <button onClick={() => setStatus('idle')} className="p-2 hover:bg-gray-800 rounded-full">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">


                            {/* Counts Table */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-blue-400">Vehicle Counts</h3>

                                {/* Accident Metrics Banner (New) */}
                                {finalCounts && (finalCounts.emergency || finalCounts.ACCIDENT > 0) && (
                                    <div className="mb-4 bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-red-500/20 rounded-full text-red-500">
                                                <FiAlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <div className="text-red-400 text-xs font-bold uppercase tracking-wider">Accident Detected</div>
                                                <div className="text-xl font-bold text-white uppercase">
                                                    {finalCounts.calc_accident_type || (finalCounts.ACCIDENT > 1 ? "MULTIPLE ALERTS" : "ACCIDENT")}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-gray-400 text-xs uppercase">Severity</div>
                                            <div className="text-red-400 font-bold">{finalCounts.calc_severity || "HIGH"}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {finalCounts && Object.entries(finalCounts).map(([k, v]) => (
                                        (k !== 'lane_data' && k !== 'signals' && k !== 'emergency' && k !== 'calc_accident_type' && k !== 'calc_severity' && k !== 'ACCIDENT') && (
                                            <div key={k} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                                                <span className="capitalize text-gray-400">{k.replace(/_/g, ' ')}</span>
                                                <span className="font-bold text-xl">{v}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Snapshot Preview */}
                            {snapshotPath && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-purple-400">Snapshot</h3>
                                    <div className="rounded-lg overflow-hidden border border-gray-700">
                                        <img src={`http://localhost:5000/uploads/${snapshotPath.split(/[\\/]/).pop()}`} alt="Snapshot" className="w-full object-cover" />
                                        {/* Note: This assumes specific backend serving setup, might need adjustment */}
                                    </div>
                                </div>
                            )}

                            {/* AI Report */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-orange-400">AI Safety Report</h3>

                                {!isSaved ? (
                                    <div className="bg-gray-800 p-6 rounded-xl text-center border border-dashed border-gray-600">
                                        <p className="text-gray-400 mb-4">Save results to generate AI analysis and send alerts.</p>
                                        <button
                                            onClick={handleSaveResults}
                                            disabled={saving}
                                            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto shadow-lg transition-all ${saving
                                                ? 'bg-gray-600 cursor-not-allowed opacity-75'
                                                : 'bg-green-600 hover:bg-green-500 shadow-green-500/20 text-white'
                                                }`}
                                        >
                                            {saving ? (
                                                <><FiLoader className="animate-spin" /> Generating AI Report...</>
                                            ) : (
                                                <><FiSave /> Save Results & Generate Report</>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-gray-800 p-4 rounded-xl text-sm leading-relaxed text-gray-300 border border-green-500/30">
                                        <div className="flex items-center gap-2 text-green-400 mb-2 font-bold">
                                            <FiSave /> Results Saved Successfully!
                                        </div>
                                        <div
                                            className="report-html-content space-y-2"
                                            dangerouslySetInnerHTML={{ __html: aiReport || "Report generated." }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-700 sticky bottom-0 bg-gray-900 flex justify-end">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Close & Start New
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SimulationPage;
