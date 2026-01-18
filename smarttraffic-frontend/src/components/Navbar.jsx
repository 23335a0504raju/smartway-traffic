import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">🚦 SmartWay</div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/live-camera">Live Feed</Link></li>
        <li><Link to="/simulation">Simulation</Link></li>
        <li><Link to="/sumo">SUMO Sim</Link></li>
        <li><Link to="/emergency">Emergency</Link></li>
        <li><Link to="/alerts">Alerts</Link></li>
        <li><Link to="/analytics">Analytics</Link></li>
        <li><Link to="/about">About</Link></li>
      </ul>
    </nav>
  );
}

export default Navbar;
