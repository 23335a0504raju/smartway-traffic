
const Loader = ({ size = 'medium', color = 'primary' }) => {
  const sizeMap = {
    small: '16px',
    medium: '24px',
    large: '32px'
  };

  return (
    <div 
      className="loader"
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderColor: `var(--${color}) transparent var(--${color}) transparent`
      }}
    ></div>
  );
};

export default Loader;