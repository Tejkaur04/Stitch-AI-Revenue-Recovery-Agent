import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import './AppLayout.css';

const AppLayout = () => {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="app-root">
      {!isLanding && <Sidebar />}
      <div className={isLanding ? 'landing-shell' : 'page-shell'}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
