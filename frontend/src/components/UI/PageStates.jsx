import React from 'react';
import { Link } from 'react-router-dom';

export const EmptyState = ({ icon: Icon, title, sub, ctaTo, ctaLabel }) => (
  <div className="empty-state">
    {Icon && <Icon size={64} className="empty-state-icon" />}
    <div className="empty-state-title">{title}</div>
    {sub && <div className="empty-state-sub">{sub}</div>}
    {ctaTo && ctaLabel && (
      <Link to={ctaTo} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
        {ctaLabel}
      </Link>
    )}
  </div>
);

export const ErrorBanner = ({ onRetry, message }) => (
  <div className="error-banner" role="alert">
    <span>{message || 'Could not connect to backend. Start the server and refresh.'}</span>
    {onRetry && (
      <button className="btn btn-secondary" type="button" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

export const PageSkeleton = ({ rows = 3 }) => (
  <div className="skeleton-stack" aria-hidden>
    <div className="skeleton-card short" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`skeleton-card ${i === 0 ? 'tall' : ''}`} />
    ))}
  </div>
);

export const Sparkline = ({ data = [], color = '#A855F7' }) => {
  const points = data.length >= 2 ? data : [0, 0, 0, 0, 0, 0, 0];
  const w = 88;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="sparkline" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" points={coords} />
    </svg>
  );
};
