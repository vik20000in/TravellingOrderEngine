import { NavLink } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import './Navbar.css'

export default function Navbar() {
  const { loadMasterData, masterLoading } = useAppContext()

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
        <button
          className="nav-btn nav-refresh"
          onClick={loadMasterData}
          disabled={masterLoading}
          title="Refresh data"
        >
          <span className={`refresh-icon${masterLoading ? ' spinning' : ''}`}>⟳</span>
        </button>
      </div>
    </nav>
  )
}
