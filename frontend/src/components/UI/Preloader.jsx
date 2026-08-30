import React, { useEffect, useState } from 'react';
import './Preloader.css';

const Preloader = ({ onDone }) => {
  const [phase, setPhase] = useState('visible'); // visible | fading | done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 2200);
    const t2 = setTimeout(() => {
      setPhase('done');
      onDone?.();
    }, 2900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  if (phase === 'done') return null;

  return (
    <div className={`preloader ${phase === 'fading' ? 'fading' : ''}`}>
      {/* Ambient glows */}
      <div className="pl-glow pl-glow-left" />
      <div className="pl-glow pl-glow-right" />

      <div className="pl-content">
        <div className="pl-orb">
          <div className="pl-orb-inner" />
          <div className="pl-orb-ring" />
          <div className="pl-orb-ring pl-orb-ring-2" />
        </div>
        <h1 className="pl-title">STITCH</h1>
        <p className="pl-sub">Initializing recovery engine…</p>
        <div className="pl-progress">
          <div className="pl-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default Preloader;
