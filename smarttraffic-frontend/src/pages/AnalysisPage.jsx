import { useEffect, useState } from 'react';
import { FiCheckCircle, FiClock, FiFile, FiLoader, FiTrash2, FiUploadCloud, FiVideo } from 'react-icons/fi';

const AnalysisPage = () => {
    const [videos, setVideos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVideos();
    }, []);

    const [formData, setFormData] = useState({
        file: null,
        pincode: '',
        city: '',
        state: '',
        country: 'India',
        road_name: '',
        address_line: '',
        email: ''
    });

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/videos');
            const data = await response.json();
            if (Array.isArray(data)) {
                setVideos(data);
            }
        } catch (error) {
            console.error('Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePincodeChange = async (e) => {
        const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
        setFormData(prev => ({ ...prev, pincode: pin }));

        if (pin.length === 6) {
            try {
                // Fetch Address Details
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await res.json();

                if (data[0].Status === 'Success') {
                    const postOffice = data[0].PostOffice[0];
                    setFormData(prev => ({
                        ...prev,
                        city: postOffice.District,
                        state: postOffice.State,
                        country: postOffice.Country
                    }));
                }
            } catch (err) {
                console.error("Pincode API Error", err);
            }
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!formData.file) return;

        setUploading(true);
        const data = new FormData();
        data.append('video', formData.file);

        // Append all address fields
        data.append('pincode', formData.pincode);
        data.append('city', formData.city);
        data.append('state', formData.state);
        data.append('country', formData.country);
        data.append('road_name', formData.road_name);
        data.append('address_line', formData.address_line);
        data.append('email', formData.email);

        try {
            const response = await fetch('http://localhost:5000/api/videos', {
                method: 'POST',
                body: data,
            });

            if (response.ok) {
                await fetchVideos();
                alert('Video Uploaded & Analyzed Successfully!');
                // Reset Form
                setFormData({
                    file: null, pincode: '', city: '', state: '',
                    country: 'India', road_name: '', address_line: ''
                });
            } else {
                alert('Upload failed. Check backend logs.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Server error during upload');
        } finally {
            setUploading(false);
        }
    };



    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this video and its analysis data?')) return;

        try {
            await fetch(`http://localhost:5000/api/videos/${id}`, { method: 'DELETE' });
            fetchVideos();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto fade-in">
            <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">Video Analysis Manager</h1>
            <p className="text-[var(--text-secondary)] mb-8">Upload footage for automatic AI processing. Results are stored in the database.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Upload Section with Address Form */}
                <div className="card p-6 border border-[var(--border-color)] bg-[var(--surface-light)]">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FiUploadCloud className="text-[var(--primary)]" />
                        Upload New Video
                    </h3>

                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Pincode with Auto-fill */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Pincode</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
                                    placeholder="530003"
                                    value={formData.pincode}
                                    onChange={handlePincodeChange}
                                    maxLength={6}
                                    required
                                />
                            </div>

                            {/* Auto-filled Fields */}
                            <div>
                                <label className="block text-sm font-medium mb-1">City</label>
                                <input type="text" className="w-full p-2 rounded bg-[var(--surface)] border border-[var(--border-color)] text-gray-400" value={formData.city} readOnly />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">State</label>
                                <input type="text" className="w-full p-2 rounded bg-[var(--surface)] border border-[var(--border-color)] text-gray-400" value={formData.state} readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Country</label>
                                <input type="text" className="w-full p-2 rounded bg-[var(--surface)] border border-[var(--border-color)] text-gray-400" value={formData.country} readOnly />
                            </div>
                        </div>

                        {/* Road Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Area / Road Name</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
                                placeholder="e.g. MG Road, Near Central Park"
                                value={formData.road_name}
                                onChange={(e) => setFormData({ ...formData, road_name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Full Address */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Address Line</label>
                            <textarea
                                className="w-full p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
                                rows="2"
                                placeholder="Detailed address..."
                                value={formData.address_line}
                                onChange={(e) => setFormData({ ...formData, address_line: e.target.value })}
                                required
                            />
                        </div>

                        {/* Alert Email */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Alert Email (For Reports)</label>
                            <input
                                type="email"
                                className="w-full p-2 rounded bg-[var(--background)] border border-[var(--border-color)]"
                                placeholder="recipient@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        {/* File Input */}
                        <div className="border-2 border-dashed border-[var(--border-color)] p-4 rounded text-center cursor-pointer hover:bg-[var(--background)] relative">
                            <input
                                type="file"
                                accept="video/*,image/*"
                                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                required
                            />
                            {formData.file ? (
                                <p className="text-[var(--primary)] font-semibold">{formData.file.name}</p>
                            ) : (
                                <p className="text-[var(--text-secondary)]">Click to Select Video File</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={uploading || !formData.file}
                            className={`w-full py-3 rounded font-bold text-white transition-all ${uploading || !formData.file ? 'bg-gray-500 cursor-not-allowed pointer-events-none opacity-50' : 'bg-[var(--primary)] hover:opacity-90'}`}
                        >
                            {uploading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <FiLoader className="animate-spin" /> Uploading & Analyzing...
                                </span>
                            ) : "Upload & Start Analysis"}
                        </button>
                    </form>
                </div>

                {/* Video List */}
                <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FiVideo /> Analysis Library ({videos.length})
                        </h2>
                        <button onClick={fetchVideos} className="text-sm flex items-center gap-2 text-[var(--primary)] hover:underline">
                            <FiLoader /> Refresh List
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center p-8 text-[var(--text-secondary)]">Loading library...</div>
                    ) : videos.length === 0 ? (
                        <div className="text-center p-8 border rounded-lg border-[var(--border)] text-[var(--text-secondary)]">
                            No videos processed yet. Upload one to start.
                        </div>
                    ) : (
                        videos.map((video) => (
                            <div key={video.id} className="card p-4 flex items-center justify-between group hover:border-[var(--primary)] transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center text-[var(--text-secondary)]">
                                        <FiFile size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg">{video.filename}</div>
                                        <div className="text-sm text-[var(--text-secondary)] flex flex-wrap items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1"><FiClock size={12} /> {new Date(video.created_at).toLocaleString()}</span>
                                            <span className="flex items-center gap-1">{(video.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>

                                            {/* Status Badge */}
                                            {video.status === 'processed' ? (
                                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-bold flex items-center gap-1">
                                                    <FiCheckCircle /> Analyzed
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold">
                                                    {video.status}
                                                </span>
                                            )}
                                        </div>

                                        {/* Analysis Data & Report (Unified View) */}
                                        <div className="mt-4 w-full">
                                            {/* Debug Log */}


                                            {video.analysis_summary && (
                                                <div className="grid md:grid-cols-2 gap-4 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">

                                                    {/* Column 1: Counts Table */}
                                                    <div>
                                                        <h4 className="font-bold text-[var(--text-secondary)] mb-2 uppercase text-xs tracking-wider">Analysis Data</h4>
                                                        <table className="w-full text-sm text-left bg-[var(--surface)] rounded-md overflow-hidden">
                                                            <thead className="text-xs uppercase bg-[var(--bg-card)] text-[var(--text-secondary)]">
                                                                <tr>
                                                                    <th className="px-3 py-1">Type</th>
                                                                    <th className="px-3 py-1 text-right">Count</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.entries(video.analysis_summary || {})
                                                                    .filter(([key]) => !['ai_report', 'alerts', 'lane_data', 'signals', 'ai_summary_text', 'html_report'].includes(key))
                                                                    .map(([key, value]) => {
                                                                        if (typeof value === 'object' && value !== null) return null;
                                                                        return (
                                                                            <tr key={key} className="border-b border-[var(--border)] last:border-none">
                                                                                <td className="px-3 py-1 font-medium capitalize">{key.replace(/_/g, ' ')}</td>
                                                                                <td className="px-3 py-1 text-right font-mono font-bold text-[var(--primary)]">{value}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                </div>
                                            )}
                                        </div>


                                    </div>
                                </div>


                                <button
                                    onClick={() => handleDelete(video.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Video"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisPage;
