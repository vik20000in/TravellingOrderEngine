import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav id="navBar">
      <div className="nav-brand">TravellingOrder Engine</div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          Orders
        </NavLink>
        <NavLink to="/master" className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          Master Data
        </NavLink>
      </div>
    </nav>
  )
}
