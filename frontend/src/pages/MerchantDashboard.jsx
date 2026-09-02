import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, MessageSquare, ShieldCheck, TrendingUp } from 'lucide-react';
import { razorpayApi } from '../services/api';

const formatPaise = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const MerchantDashboard = () => {
  const [summary, setSummary] = useState({ total_at_risk_paise: 0, total_recovered_paise: 0, customer_contacts: 0, recovery_rate: 0 });
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [remoteSummary, remoteIncidents] = await Promise.all([
          razorpayApi.getSummary(),
          razorpayApi.getIncidents()
        ]);
        if (!active) return;
        setSummary(remoteSummary);
        setIncidents((remoteIncidents.items || []).slice(0, 6));
      } catch {
        if (active) {
          setSummary({ total_at_risk_paise: 0, total_recovered_paise: 0, customer_contacts: 0, recovery_rate: 0 });
          setIncidents([]);
        }
      }
    };

    load();
    const interval = setInterval(load, 7000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const metrics = useMemo(() => [
    { label: 'Revenue at risk', value: formatPaise(summary.total_at_risk_paise / 100), accent: true },
    { label: 'Recovered', value: formatPaise(summary.total_recovered_paise / 100), accent: false },
    { label: 'Net lift', value: `+${formatPaise((summary.total_recovered_paise / 100) || 0)}`, accent: false },
    { label: 'Contacts avoided', value: `${(summary.customer_contacts || 0).toLocaleString('en-IN')}`, accent: false }
  ], [summary]);

  const queue = incidents.filter(item => ['pending', 'blocked', 'escalated'].includes(String(item.status || item.state || '').toLowerCase()) || item.policyResult?.status === 'blocked');
  const recent = incidents.filter(item => String(item.status || item.state || '').toLowerCase() === 'recovered').slice(0, 3);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#2F5FF0', fontWeight: 700 }}>Overview</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>Revenue recovery with cleaner decisions.</h1>
        <p style={{ color: '#475569', maxWidth: 700 }}>Stitch keeps payment recovery moving without escalating customer friction. Every action is policy-guarded, verified, and explainable.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginBottom: 28 }}>
        {metrics.map(item => (
          <div key={item.label} style={{ background: '#F3F1EB', border: '1px solid #0f172a', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b' }}>{item.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, color: item.accent ? '#0f172a' : '#0f172a' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
        <div style={{ background: '#F3F1EB', border: '1px solid #0f172a', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#2F5FF0', fontWeight: 700 }}>Needs attention</div>
            <ShieldCheck size={18} color="#2F5FF0" />
          </div>
          {queue.length === 0 ? (
            <div style={{ color: '#475569', padding: '1rem 0' }}>No blocked or approval-required cases right now.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map(item => (
                <div key={item.id} style={{ border: '1px solid #0f172a', borderRadius: 10, padding: 12, background: '#f8f7f3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong>{item.customer?.name || 'Customer'}</strong>
                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, background: '#dbeafe', padding: '4px 8px', borderRadius: 999 }}>{String(item.status || item.state || 'pending').toUpperCase()}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: 6 }}>{item.reason || 'Payment issue awaiting review'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#F3F1EB', border: '1px solid #0f172a', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#2F5FF0', fontWeight: 700 }}>Recent recoveries</div>
            <TrendingUp size={18} color="#2F5FF0" />
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {recent.length === 0 ? (
              <div style={{ color: '#475569', padding: '1rem 0' }}>No recovered payments yet.</div>
            ) : (
              recent.map(item => (
                <div key={item.id} style={{ border: '1px solid #0f172a', borderRadius: 10, padding: 12, background: '#f8f7f3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span>{item.customer?.name || 'Customer'}</span>
                    <span style={{ fontWeight: 700 }}>{formatPaise(item.amount_paise / 100)}</span>
                  </div>
                  <div style={{ color: '#475569', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} color="#0f172a" /> Silent retry, no customer contact.
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginTop: 28 }}>
        <Link to="/app/incidents" style={{ ...linkStyle }}>
          <ArrowUpRight size={18} /> View all incidents
        </Link>
        <Link to="/app/recovery-lab" style={{ ...linkStyle }}>
          <TrendingUp size={18} /> Open recovery lab
        </Link>
        <Link to="/app/settings" style={{ ...linkStyle }}>
          <ShieldCheck size={18} /> Policy settings
        </Link>
      </div>
    </div>
  );
};

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  justifyContent: 'center',
  padding: '1rem 1.2rem',
  borderRadius: 12,
  border: '1px solid #0f172a',
  background: '#f3f1eb',
  color: '#0f172a',
  textDecoration: 'none',
  fontWeight: 700
};

export default MerchantDashboard;
