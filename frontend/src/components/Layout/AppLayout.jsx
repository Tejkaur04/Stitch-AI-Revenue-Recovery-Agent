import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Aurora from '../UI/Aurora';
import './AppLayout.css';

const AppLayout = () => {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="app-root">
      <Aurora
        colorStops={['#4d3dff', '#ff007a', '#38bdf8']}
        amplitude={1.1}
        blend={0.65}
        speed={0.5}
      />
      {!isLanding && <Sidebar />}
      <div className={isLanding ? 'landing-shell' : 'page-shell'}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
