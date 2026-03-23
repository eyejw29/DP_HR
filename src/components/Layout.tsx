import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CheckSquare, LogOut, User as UserIcon } from 'lucide-react';
import { useAppContext } from '../store/AppContext';

const Layout = () => {
  const { currentUser, logout } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>D</div>
          DP Works HR
        </div>
        <div style={{ flex: 1, paddingTop: 16 }}>
          {isAdmin ? (
            <>
              <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={18} /><span>전사 대시보드</span>
              </NavLink>
              <NavLink to="/admin/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <CheckSquare size={18} /><span>결재/대기 관리</span>
              </NavLink>
              <NavLink to="/admin/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <CalendarDays size={18} /><span>공통 캘린더</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/my/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <UserIcon size={18} /><span>나의 연차 현황</span>
              </NavLink>
              <NavLink to="/my/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <CalendarDays size={18} /><span>공통 캘린더</span>
              </NavLink>
            </>
          )}
        </div>
        <div style={{ padding: 20, fontSize: 12, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-color)' }}>
          MVP v2.0 <br />
          Role-Based Access
        </div>
      </div>
      
      <div className="main-content">
        <div className="topbar">
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
            {isAdmin ? '관리자 워크스페이스' : '임직원 워크스페이스'}
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              {currentUser?.name} ({isAdmin ? 'Admin' : 'Employee'})
            </span>
            <button onClick={handleLogout} className="btn" style={{ padding: '6px 12px', fontSize: 12 }}>
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </div>
        
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
