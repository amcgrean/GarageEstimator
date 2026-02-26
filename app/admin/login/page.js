'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <a href="/" className="logo" aria-label="Beisser Lumber Garage Estimator">
          <img src="/beisser-logo.svg" alt="Beisser Lumber Company" className="header-logo-image" />
          <span className="logo-subtitle">Garage Estimator</span>
        </a>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)', padding: 20 }}>
        <div className="card" style={{ width: '100%', maxWidth: 380 }}>
          <div className="card-head">
            <h2>Admin Login</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="password">Admin Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="error-box" style={{ marginBottom: 12 }}>
                  <p>{error}</p>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
