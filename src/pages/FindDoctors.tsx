// src/pages/FindDoctors.tsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const SPECIALTIES = [
  'General', 'Pediatrics', 'Cardiology', 'Dermatology',
  'Orthopedics', 'Ophthalmology'
];

const CITIES = [
  'Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Barka', 'Ibri', 'Dhofar'
];

const LANGUAGES = ['English', 'Arabic', 'Hindi'];

const FindDoctors: React.FC = () => {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);

  const fetchDoctors = async () => {
    let q: any = collection(db, 'doctors');
    const conditions: any[] = [];

    if (specialty) conditions.push(where('specialty', '==', specialty));
    if (city) conditions.push(where('city', '==', city));
    if (language) conditions.push(where('language', '==', language));

    if (conditions.length > 0) q = query(collection(db, 'doctors'), ...conditions);

    const snap = await getDocs(q);
    const rows: any[] = [];
    snap.forEach(d => rows.push({ id: d.id, ...(d.data() as any) }));
    setDoctors(rows);
  };

  useEffect(() => { fetchDoctors(); /* initial load */ }, []);

  return (
    <div className="app-container">
      <h2>Find Doctors</h2>

      <div className="card">
        <div className="form-row">
          <label className="small-muted">Specialty</label>
          <select className="select" value={specialty} onChange={(e)=>setSpecialty(e.target.value)}>
            <option value="">All</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label className="small-muted">City</label>
          <select className="select" value={city} onChange={(e)=>setCity(e.target.value)}>
            <option value="">All</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label className="small-muted">Language</label>
          <select className="select" value={language} onChange={(e)=>setLanguage(e.target.value)}>
            <option value="">All</option>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={fetchDoctors}>Search Doctors</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {doctors.length === 0 ? (
          <p>No doctors found.</p>
        ) : (
          doctors.map((doctor) => (
            <div key={doctor.id} className="card">
              <h3>{doctor.name}</h3>
              <p className="small-muted"><strong>Specialty:</strong> {doctor.specialty}</p>
              <p className="small-muted"><strong>City:</strong> {doctor.city || 'N/A'}</p>
              <p className="small-muted"><strong>Clinic:</strong> {doctor.clinicName || '—'}</p>
              <p className="small-muted"><strong>Language:</strong> {doctor.language}</p>
              <div className="card-actions">
                <button className="btn btn-primary" onClick={() => navigate(`/book/${doctor.id}`)}>
                  Book Appointment
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FindDoctors;
