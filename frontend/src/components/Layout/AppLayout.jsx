import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FloatingNav from './FloatingNav';
import './AppLayout.css';

const AppLayout = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="app-root">
      <FloatingNav />
      <div className={`app-main ${isLanding ? 'landing-shell' : 'page-shell'}`}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
