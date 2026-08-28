import React, { useState, useEffect } from 'react';
import './GradientCarousel.css';

const GradientCarousel = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [animating, setAnimating] = useState(false);

  const goto = (idx) => {
    if (animating || idx === current) return;
    setPrev(current);
    setAnimating(true);
    setCurrent(idx);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 600);
  };

  useEffect(() => {
    const t = setInterval(() => {
      goto((current + 1) % slides.length);
    }, 4000);
    return () => clearInterval(t);
  }, [current, slides.length, animating]);

  return (
    <div className="gc-root">
      <div className="gc-track">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`gc-slide ${i === current ? 'active' : ''} ${i === prev ? 'exiting' : ''}`}
            style={{ background: slide.gradient }}
          >
            <div className="gc-slide-inner">
              <div className="gc-icon">{slide.icon}</div>
              <div className="gc-label">{slide.label}</div>
              <h3 className="gc-title">{slide.title}</h3>
              <p className="gc-desc">{slide.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="gc-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`gc-dot ${i === current ? 'active' : ''}`}
            onClick={() => goto(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default GradientCarousel;
