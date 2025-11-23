import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Optional: force account chooser every time
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      // Common cause: domain not in Authorized domains
      alert(err?.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand-panel">
          <div className="brand-title">Oman Health</div>
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

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleGoogleLogin}>
              Continue with Google
            </button>
          </div>

          <p style={{ marginTop: 12 }} className="small-muted">
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
