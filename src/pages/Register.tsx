import React, { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

// Shared option lists (kept here so Register + FindDoctors can match)
const SPECIALTIES = ['Cardiology', 'Dermatology', 'ENT', 'Gastroenterology', 'General', 'Neurology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Pulmonology', 'Rheumatology'] as const;
const CITIES = ['Barka', 'Dhofar', 'Ibri', 'Muscat', 'Nizwa', 'Salalah', 'Sohar', 'Sur'] as const; // Pre-sorted
const LANGUAGES = ['Arabic', 'English', 'Hindi'] as const; // Pre-sorted

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);

  const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert('You must consent to data processing to register.');
      return;
    }
    if (!strongPw.test(password)) {
      alert('Password must be at least 8 chars and include upper, lower, number, and a special symbol.');
      return;
    }
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        roles: ['patient'],
        consent: {
          given: true,
          text: "I consent to data processing under Oman's PDPL (Royal Decree 6/2022)",
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      });
      await signInWithEmailAndPassword(auth, email, password); // Auto-login
      navigate('/dashboard');
    } catch (error: any) {
      alert(error.message || 'Registration failed.');
    }
  };

  const option = (v: string) => <option key={v} value={v}>{v}</option>;
  const specialtyOptions = useMemo(() => SPECIALTIES.map(option), []);
  const cityOptions = useMemo(() => CITIES.map(option), []);
  const languageOptions = useMemo(() => LANGUAGES.map(option), []);

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand-panel">
          <div className="brand-title">Oman Health</div>
        </div>
        <div className="form-panel card">
          <h2 style={{ marginTop: 0 }}>Register</h2>
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <label className="label">Full Name</label>
              <input className="input" type="text" value={name} required onChange={(e)=>setName(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} required onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="label">Password</label>
              <input className="input" type="password" value={password} required onChange={(e)=>setPassword(e.target.value)} placeholder="Min 8, upper/lower/number/special" />
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="checkbox" checked={consent} onChange={() => setConsent(!consent)} />
                <span>I consent to data processing under Oman's PDPL (Royal Decree 6/2022)</span>
              </label>
            </div>
            <p className="small-muted">Data Protection Notice: Your personal data will be processed in accordance with Oman’s PDPL. Data retention: 12 months maximum. You have the right to access, correct, and delete your data.</p>
            <div className="card-actions">
              <button className="btn btn-primary" type="submit">Register</button>
              <Link to="/login" className="btn">Login</Link>
            </div>
            <p className="small-muted" style={{ marginTop: 12 }}>
              Doctor? <Link to="/apply-doctor">Apply here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Register;