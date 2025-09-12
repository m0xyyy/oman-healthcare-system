// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';

type Appt = {
  id: string;
  patientUserId: string;
  patientName?: string;
  doctorUserId: string;
  doctorName?: string;
  specialty?: string;
  city?: string;
  language?: string;
  clinicName?: string;
  day?: string;
  date?: string;
  time?: string;
  reason?: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  createdAt?: string;
};

const Dashboard: React.FC = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'patient' | 'doctor' | ''>('');
  const [name, setName] = useState('');
  const [appointments, setAppointments] = useState<Appt[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!auth.currentUser) return nav('/login');
      setLoading(true);
      const uid = auth.currentUser.uid;

      const u = await getDoc(doc(db, 'users', uid));
      const r = (u.exists() ? (u.data() as any).role : '') as 'patient' | 'doctor' | '';
      setRole(r);
      setName((u.exists() && ((u.data() as any).name || auth.currentUser.email)) || '');

      let q;
      if (r === 'patient') q = query(collection(db, 'appointments'), where('patientUserId', '==', uid));
      if (r === 'doctor')  q = query(collection(db, 'appointments'), where('doctorUserId',  '==', uid));

      if (q) {
        const snap = await getDocs(q);
        const list: Appt[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setAppointments(await hydratePatientNames(list));
      } else {
        setAppointments([]);
      }
      setLoading(false);
    };

    const hydratePatientNames = async (list: Appt[]) => {
      const missing = Array.from(new Set(list.filter(a => !a.patientName && a.patientUserId).map(a => a.patientUserId)));
      if (!missing.length) return list;
      const lookups = await Promise.all(missing.map(id => getDoc(doc(db, 'users', id))));
      const map: Record<string, string> = {};
      lookups.forEach((s, i) => {
        map[missing[i]] = s.exists() ? ((s.data() as any).name || (s.data() as any).email || missing[i]) : missing[i];
      });
      return list.map(a => ({ ...a, patientName: a.patientName || map[a.patientUserId] || a.patientName }));
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortNewestFirst = (xs: Appt[]) => {
    const key = (a: Appt) => a.createdAt || `${a.date || ''} ${a.time || ''}`;
    return xs.slice().sort((a, b) => (key(a) > key(b) ? -1 : key(a) < key(b) ? 1 : 0));
  };

  const upcoming = useMemo(
    () => sortNewestFirst(appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')),
    [appointments]
  );
  const history = useMemo(
    () => sortNewestFirst(appointments.filter(a => a.status === 'canceled' || a.status === 'completed')),
    [appointments]
  );

  const updateStatus = async (id: string, status: Appt['status']) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    } catch {
      alert('Failed to update appointment status.');
    }
  };

  const removeFromHistory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Failed to remove appointment.');
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard...</p>;

  return (
    <div className="app-container" style={{ padding: '2rem 1rem' }}>
      <h2>Dashboard</h2>
      <p>Welcome, {name}!</p>

      {role === 'patient' && (
        <div style={{ margin: '8px 0 16px' }}>
          <button className="btn btn-primary" onClick={() => nav('/dashboard/find-doctors')}>Find Doctors</button>
        </div>
      )}

      {role === 'patient' && (
        <section>
          <h3>Your Appointments</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            upcoming.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 12 }}>
                <div><strong>Doctor:</strong> {a.doctorName || '—'} {a.clinicName ? `— ${a.clinicName}` : ''}</div>
                <div><strong>Date:</strong> {a.date || a.day || '—'} | <strong>Time:</strong> {a.time || '—'}</div>
                <div><strong>Status:</strong> {a.status}</div>
                {a.reason && <div><strong>Reason:</strong> {a.reason}</div>}

                {a.status === 'pending' && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (!window.confirm('Cancel this appointment?')) return;
                        updateStatus(a.id, 'canceled');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          <h3 style={{ marginTop: 20 }}>Appointment History</h3>
          {history.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            history.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 12 }}>
                <div><strong>Doctor:</strong> {a.doctorName || '—'} {a.clinicName ? `— ${a.clinicName}` : ''}</div>
                <div><strong>Date:</strong> {a.date || a.day || '—'} | <strong>Time:</strong> {a.time || '—'}</div>
                <div><strong>Status:</strong> {a.status}</div>
                {a.reason && <div><strong>Reason:</strong> {a.reason}</div>}
                {a.status === 'canceled' && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => removeFromHistory(a.id)}>Remove from history</button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {role === 'doctor' && (
        <section style={{ marginTop: 12 }}>
          <h3>Upcoming Appointments</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {upcoming.map(a => (
                <li key={a.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {a.date || a.day || '—'} at <strong>{a.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {a.status}</div>
                  <div><strong>Patient:</strong> {a.patientName || a.patientUserId || '—'}</div>
                  {a.reason && <div><em>Reason:</em> {a.reason}</div>}
                  {a.status === 'pending' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => updateStatus(a.id, 'confirmed')} style={{ marginRight: 8 }}>
                        Confirm
                      </button>
                      <button className="btn btn-danger" onClick={() => updateStatus(a.id, 'canceled')}>
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 20 }}>Appointment History</h3>
          {history.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {history.map(a => (
                <li key={a.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {a.date || a.day || '—'} at <strong>{a.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {a.status}</div>
                  <div><strong>Patient:</strong> {a.patientName || a.patientUserId || '—'}</div>
                  {a.reason && <div><em>Reason:</em> {a.reason}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default Dashboard;
