import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


export const TrafficFlowChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data && data.length > 0 ? data : []}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis dataKey="time" stroke="var(--text-secondary)" />
      <YAxis stroke="var(--text-secondary)" />
      <Tooltip
        contentStyle={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}
      />
      <Line type="monotone" dataKey="vehicles" stroke="var(--primary)" strokeWidth={2} />
      <Line type="monotone" dataKey="congestion" stroke="var(--accent)" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const JunctionChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data && data.length > 0 ? data : []}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
      <XAxis dataKey="junction" stroke="var(--text-secondary)" />
      <YAxis stroke="var(--text-secondary)" />
      <Tooltip
        contentStyle={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '8px'
        }}
      />
      <Bar dataKey="vehicles" fill="var(--primary)" />
      <Bar dataKey="efficiency" fill="var(--success)" />
    </BarChart>
  </ResponsiveContainer>
);