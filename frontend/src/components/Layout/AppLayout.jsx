import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FloatingNav from './FloatingNav';
import Aurora from '../UI/Aurora';
import './AppLayout.css';

const AppLayout = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="app-root">
      <Aurora
        colorStops={['#4d3dff', '#ff007a', '#38bdf8']}
        amplitude={1.1}
        blend={0.65}
        speed={0.5}
      />
      <FloatingNav />
      <div className={`app-main ${isLanding ? 'landing-shell' : 'page-shell'}`}>
        <Outlet />
      </div>
    </div>
  );
};

export default AppLayout;
