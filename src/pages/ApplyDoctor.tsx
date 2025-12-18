import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';

const SPECIALTIES = ['Cardiology', 'Dermatology', 'ENT', 'Gastroenterology', 'General', 'Neurology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Pulmonology', 'Rheumatology'] as const;
const CITIES = ['Barka', 'Dhofar', 'Ibri', 'Muscat', 'Nizwa', 'Salalah', 'Sohar', 'Sur'] as const; // Pre-sorted
const LANGUAGES = ['Arabic', 'English', 'Hindi'] as const; // Pre-sorted

const ApplyDoctor: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [specialty, setSpecialty] = useState<string>(SPECIALTIES[0]);
  const [city, setCity] = useState<string>(CITIES[0]);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [clinicName, setClinicName] = useState('');
  const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return alert('Consent required.');
    if (!strongPw.test(password)) return alert('Password: 8+ chars, upper/lower/number/special.');
    if (!verificationCode) return alert('Doctor ID Code required.');
    if (!specialty || !city || !language) return alert('All fields required.');

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        roles: ['doctor'],
        consent: { given: true, text: "I consent to data processing under Oman's PDPL (Royal Decree 6/2022)", timestamp: new Date().toISOString() },
        createdAt: new Date().toISOString()
      });

      const codeRef = doc(db, 'doctorIds', verificationCode.trim());
      const codeSnap = await getDoc(codeRef);
      if (!codeSnap.exists() || codeSnap.data()?.status !== 'unused') throw new Error('Invalid or used code.');

      await setDoc(doc(db, 'doctors', user.uid), {
        userId: user.uid,
        name,
        specialty,
        city,
        language,
        clinicName,
        createdAt: serverTimestamp()
      });

      await updateDoc(codeRef, { status: 'used', usedBy: user.uid, usedAt: serverTimestamp() });

      await signInWithEmailAndPassword(auth, email, password); // Auto-login
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Application failed.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="brand-panel">
          <div className="brand-title">Oman Health</div>
        </div>

        <div className="form-panel card">
          <h2 style={{ marginTop: 0 }}>Apply as Doctor</h2>
          <form onSubmit={handleApply}>
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

            <div className="form-row">
              <label className="label">Doctor ID Code</label>
              <input className="input" value={verificationCode} onChange={(e)=>setVerificationCode(e.target.value)} required />
            </div>

            <div className="form-row">
              <label className="label">Specialty</label>
              <select className="select" value={specialty} onChange={(e)=>setSpecialty(e.target.value)} required>
                <option value="">Select…</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="label">City</label>
              <select className="select" value={city} onChange={(e)=>setCity(e.target.value)} required>
                <option value="">Select…</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="label">Language</label>
              <select className="select" value={language} onChange={(e)=>setLanguage(e.target.value)} required>
                <option value="">Select…</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="label">Clinic Name</label>
              <input className="input" value={clinicName} onChange={(e)=>setClinicName(e.target.value)} placeholder="Example Clinic" />
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <label style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="checkbox" checked={consent} onChange={() => setConsent(!consent)} />
                <span>I consent to data processing under Oman's PDPL (Royal Decree 6/2022)</span>
              </label>
            </div>

            <p className="small-muted">
              Data Protection Notice: Your personal data will be processed in accordance with Oman’s PDPL. Retention: 12 months max. Rights: access, correct, delete.
            </p>

            <div className="card-actions">
              <button className="btn btn-primary" type="submit">Apply</button>
              <Link to="/login" className="btn">Login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyDoctor;
