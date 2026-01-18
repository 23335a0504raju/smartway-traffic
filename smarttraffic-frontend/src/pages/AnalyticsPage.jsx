import { useState } from 'react';
import { FiBarChart2, FiDownload, FiTrendingUp } from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState('week');

  const performanceData = [
    { day: 'Mon', efficiency: 85, traffic: 245, waiting: 45 },
    { day: 'Tue', efficiency: 88, traffic: 267, waiting: 42 },
    { day: 'Wed', efficiency: 82, traffic: 289, waiting: 48 },
    { day: 'Thu', efficiency: 90, traffic: 234, waiting: 38 },
    { day: 'Fri', efficiency: 87, traffic: 278, waiting: 41 },
    { day: 'Sat', efficiency: 78, traffic: 198, waiting: 52 },
    { day: 'Sun', efficiency: 75, traffic: 167, waiting: 55 },
  ];

  const emergencyData = [
    { type: 'Ambulance', count: 12, response: 2.1 },
    { type: 'Fire Truck', count: 8, response: 1.8 },
    { type: 'Police', count: 15, response: 1.5 },
  ];

  const junctionData = [
    { name: 'J-01', value: 15 },
    { name: 'J-02', value: 22 },
    { name: 'J-03', value: 18 },
    { name: 'J-04', value: 12 },
    { name: 'J-05', value: 8 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="analytics-container fade-in">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Analytics & Reports</h1>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            className="filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>

          <button className="btn btn-primary">
            <FiDownload />
            Export PDF
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="stats-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            System Efficiency
          </div>
          <div className="stats-value">87%</div>
          <div className="stats-change change-positive">
            <FiTrendingUp size={14} />
            5.2% improvement
          </div>
        </div>

        <div className="stats-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Avg. Response Time
          </div>
          <div className="stats-value">2.1m</div>
          <div className="stats-change change-positive">
            <FiTrendingUp size={14} />
            12% faster
          </div>
        </div>

        <div className="stats-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Traffic Reduction
          </div>
          <div className="stats-value">34%</div>
          <div className="stats-change change-positive">
            <FiTrendingUp size={14} />
            8% better
          </div>
        </div>

        <div className="stats-card">
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Fuel Savings
          </div>
          <div className="stats-value">18%</div>
          <div className="stats-change change-positive">
            <FiTrendingUp size={14} />
            3% improvement
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-container">
        {/* Performance Trend */}
        <div className="analytics-chart">
          <div className="card-header">
            <h3 className="card-title">
              <FiTrendingUp style={{ marginRight: '0.5rem' }} />
              Performance Trends
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="efficiency"
                stroke="var(--primary)"
                strokeWidth={2}
                name="Efficiency %"
              />
              <Line
                type="monotone"
                dataKey="waiting"
                stroke="var(--accent)"
                strokeWidth={2}
                name="Wait Time (s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Distribution */}
        <div className="analytics-chart">
          <div className="card-header">
            <h3 className="card-title">
              <FiBarChart2 style={{ marginRight: '0.5rem' }} />
              Traffic Distribution
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={junctionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {junctionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Emergency Response */}
        <div className="analytics-chart">
          <div className="card-header">
            <h3 className="card-title">Emergency Response Analysis</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emergencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="type" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="var(--primary)" name="Incidents" />
              <Bar dataKey="response" fill="var(--accent)" name="Avg Response (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Flow Comparison */}
        <div className="analytics-chart">
          <div className="card-header">
            <h3 className="card-title">Before/After AI Implementation</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { period: 'Wait Time', before: 78, after: 45 },
                { period: 'Congestion', before: 65, after: 34 },
                { period: 'Emergencies', before: 4.2, after: 2.1 },
                { period: 'Efficiency', before: 62, after: 87 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="before" fill="var(--secondary)" name="Before AI" />
              <Bar dataKey="after" fill="var(--success)" name="After AI" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Reports */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Performance Summary</h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Achievements</h4>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '2' }}>
              <li>✅ 45% reduction in average wait time</li>
              <li>✅ 34% decrease in traffic congestion</li>
              <li>✅ 52% faster emergency response</li>
              <li>✅ 18% fuel savings across network</li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Recommendations</h4>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '2' }}>
              <li>🚀 Optimize Junction J-07 timing patterns</li>
              <li>🚀 Add camera coverage at Highway entrance</li>
              <li>🚀 Extend AI model training dataset</li>
              <li>🚀 Implement predictive congestion alerts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;