import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch {
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand-panel">
          <div className="brand-title">Oman Health</div>
          <div className="brand-sub">
            A simple, PDPL-compliant healthcare appointment prototype for Oman.
            Search doctors, book appointments, and track visit status.
          </div>
        </div>

        <div className="form-panel card">
          <h2 style={{ marginTop: 0 }}>Login</h2>

          <form onSubmit={handleLogin}>
            <div className="form-row">
              <label className="label">Email</label>
              <input
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="card-actions">
              <button className="btn btn-primary" type="submit">Login</button>
              <Link to="/register" className="btn">Register</Link>
            </div>
          </form>

          <p style={{ marginTop: 12 }} className="small-muted">
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
