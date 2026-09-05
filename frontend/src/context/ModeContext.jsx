import React, { createContext, useContext, useState } from 'react';

const ModeContext = createContext();

export const useMode = () => useContext(ModeContext);

export const ModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = window.localStorage.getItem('stitch-mode');
    return savedMode === 'simulation' ? 'simulation' : 'razorpay';
  });

  const changeMode = nextMode => {
    const normalizedMode = nextMode === 'razorpay' ? 'razorpay' : 'simulation';
    window.localStorage.setItem('stitch-mode', normalizedMode);
    setMode(normalizedMode);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode: changeMode }}>
      {children}
    </ModeContext.Provider>
  );
};
