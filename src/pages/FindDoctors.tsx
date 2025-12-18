import React, { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const SPECIALTIES = ['Cardiology','Dermatology','ENT','Gastroenterology','General','Neurology','Ophthalmology','Orthopedics','Pediatrics','Pulmonology','Rheumatology'] as const;
const CITIES = ['Muscat','Salalah','Sohar','Nizwa','Sur','Barka','Ibri','Dhofar'] as const;
const LANGUAGES = ['English','Arabic','Hindi'] as const;

type DoctorRow = {
  id: string;
  userId?: string;
  name: string;
  specialty: string;
  city?: string;
  language?: string;
  clinicName?: string;
};

const FindDoctors: React.FC = () => {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchDoctors = async () => {
    setLoading(true);
    setErr(null);
    try {
      let qRef: any = collection(db, 'doctors');
      const conditions: any[] = [];
      if (specialty) conditions.push(where('specialty', '==', specialty));
      if (city) conditions.push(where('city', '==', city));
      if (language) conditions.push(where('language', '==', language));
      if (conditions.length) qRef = query(collection(db, 'doctors'), ...conditions);

      const snap = await getDocs(qRef);
      const rows: DoctorRow[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setDoctors(rows);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || 'Failed to load doctors.');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDoctors(); }, []); // initial

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
          <button className="btn" onClick={fetchDoctors} disabled={loading}>
            {loading ? 'Loading…' : 'Search Doctors'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {err && <div className="card" style={{ borderLeft:'4px solid #c0392b', padding:10 }}>{err}</div>}
        {loading ? <p>Loading…</p> : doctors.length === 0 ? (
          <p>No doctors found.</p>
        ) : (
          doctors.map((doctor) => (
            <div key={doctor.id} className="card">
              <h3 style={{ marginBottom: 4 }}>{doctor.name}</h3>
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