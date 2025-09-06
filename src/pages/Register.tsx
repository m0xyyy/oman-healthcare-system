// src/pages/Register.tsx
import React, { useMemo, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

// Shared option lists (kept here so Register + FindDoctors can match)
const SPECIALTIES = ['General','Pediatrics','Cardiology','Dermatology','Orthopedics','Ophthalmology'] as const;
const CITIES      = ['Muscat','Salalah','Sohar','Nizwa','Sur','Barka','Ibri','Dhofar'] as const;
const LANGUAGES   = ['English','Arabic','Hindi'] as const;

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'patient' | 'doctor'>('patient');
  const [consent, setConsent]   = useState(false);

  // doctor-only fields
  const [specialty, setSpecialty] = useState<typeof SPECIALTIES[number]>('General');
  const [city, setCity]           = useState<typeof CITIES[number]>('Muscat');
  const [language, setLanguage]   = useState<typeof LANGUAGES[number]>('English');
  const [clinicName, setClinicName] = useState('');

  const option = (v: string) => <option key={v} value={v}>{v}</option>;
  const specialtyOptions = useMemo(() => SPECIALTIES.map(option), []);
  const cityOptions      = useMemo(() => CITIES.map(option), []);
  const languageOptions  = useMemo(() => LANGUAGES.map(option), []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      alert('You must consent to data processing to register.');
      return;
    }
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role,
        consent: {
          given: true,
          text: "I consent to data processing under Oman's PDPL (Royal Decree 6/2022)",
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      });

      if (role === 'doctor') {
        await setDoc(doc(db, 'doctors', user.uid), {
          userId: user.uid,
          name,
          specialty,
          city,
          language,
          clinicName: clinicName.trim()
        });
      }

      navigate('/dashboard');
    } catch (error: any) {
      alert(error.message || 'Registration failed.');
    }
  };

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
              <input className="input" type="password" value={password} required onChange={(e)=>setPassword(e.target.value)} />
            </div>

            <div className="form-row row" style={{ gap: 18 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="radio" value="patient" checked={role==='patient'} onChange={()=>setRole('patient')} /> Patient
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="radio" value="doctor" checked={role==='doctor'} onChange={()=>setRole('doctor')} /> Doctor
              </label>
            </div>

            {role === 'doctor' && (
              <div className="card" style={{ marginTop: 8 }}>
                <div className="form-row">
                  <label className="label">Specialty</label>
                  <select className="select" value={specialty} onChange={(e)=>setSpecialty(e.target.value as any)}>
                    {specialtyOptions}
                  </select>
                </div>

                <div className="form-row">
                  <label className="label">City</label>
                  <select className="select" value={city} onChange={(e)=>setCity(e.target.value as any)}>
                    {cityOptions}
                  </select>
                </div>

                <div className="form-row">
                  <label className="label">Language</label>
                  <select className="select" value={language} onChange={(e)=>setLanguage(e.target.value as any)}>
                    {languageOptions}
                  </select>
                </div>

                <div className="form-row">
                  <label className="label">Clinic Name / Facility</label>
                  <input className="input" value={clinicName} onChange={(e)=>setClinicName(e.target.value)} />
                </div>
              </div>
            )}

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
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
