import React from 'react';
import { Outlet } from 'react-router-dom';
import FloatingNav from './FloatingNav';
import './AppLayout.css';

const AppLayout = () => (
  <div className="app-root">
    <FloatingNav />
    <div className="app-main">
      <Outlet />
    </div>
  </div>
);

export default AppLayout;
