// src/pages/Login.tsx
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
    <div className="app-container">
      <form onSubmit={handleLogin}>
        <h2>Login</h2>

        <div className="form-row">
          <input className="input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>

        <div className="form-row">
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>

        <div className="card-actions">
          <button className="btn btn-primary" type="submit">Login</button>
        </div>

        <p style={{ marginTop: 12 }}>Don’t have an account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  );
};

export default Login;
