import { FiTrendingDown, FiTrendingUp } from 'react-icons/fi';

const StatsCard = ({ title, value, change, icon, color = 'primary' }) => {
  const ChangeIcon = change > 0 ? FiTrendingUp : FiTrendingDown;
  
  return (
    <div className="stats-card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
            {title}
          </div>
          <div className="stats-value">{value}</div>
          <div className={`stats-change ${change > 0 ? 'change-positive' : 'change-negative'}`}>
            <ChangeIcon size={14} />
            {Math.abs(change)}% from last hour
          </div>
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `var(--${color})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '1.5rem'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;