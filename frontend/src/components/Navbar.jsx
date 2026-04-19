import { useAuth } from '../AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="8" fill="url(#g)"/><path d="M8 9h12M8 14h8M8 19h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><defs><linearGradient id="g" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs></svg>
          <span>DeepReader</span>
        </NavLink>
        <div className="navbar-links">
          {user && (
            <>
              <NavLink to="/books" className="nav-link">📚 Sách</NavLink>
              <NavLink to="/settings" className="nav-link">⚙️ Cài đặt</NavLink>
              {user.role === 'ADMIN' && <NavLink to="/admin" className="nav-link">🛡️ Admin</NavLink>}
              <div className="nav-user">
                <span className="nav-email">{user.email}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout} id="logout-btn">Đăng xuất</button>
              </div>
            </>
          )}
          {!user && (
            <>
              <NavLink to="/login" className="nav-link">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Đăng ký</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
