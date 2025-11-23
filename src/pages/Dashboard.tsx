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
  date?: string; // YYYY-MM-DD
  time?: string; // e.g., "2:00 PM"
  reason?: string;
  status: 'pending' | 'confirmed' | 'canceled' | 'completed';
  createdAt?: string;
  rating?: number;
  review?: string;
  ratedAt?: string;
};

type DraftRating = { rating: number; review: string };

const Dashboard: React.FC = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'patient' | 'doctor' | ''>('');
  const [name, setName] = useState('');
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [draftRatings, setDraftRatings] = useState<Record<string, DraftRating>>({});

  useEffect(() => {
    const run = async () => {
      try {
        if (!auth.currentUser) {
          nav('/login');
          return;
        }
        setLoading(true);
        const uid = auth.currentUser.uid;

        const u = await getDoc(doc(db, 'users', uid));
        const r = (u.exists() ? (u.data() as any).role : '') as 'patient' | 'doctor' | '';
        setRole(r);
        setName((u.exists() && ((u.data() as any).name || auth.currentUser.email)) || '');

        let q: any;
        if (r === 'patient') q = query(collection(db, 'appointments'), where('patientUserId', '==', uid));
        if (r === 'doctor')  q = query(collection(db, 'appointments'), where('doctorUserId',  '==', uid));

        if (q) {
          const snap = await getDocs(q);
          const list: Appt[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          setAppointments(list);
        } else {
          setAppointments([]);
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [nav]);

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

  // ----- counts + next appointment -----
  const counts = useMemo(() => {
    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const canceled  = appointments.filter(a => a.status === 'canceled').length;
    return { pending, confirmed, completed, canceled, totalUpcoming: pending + confirmed };
  }, [appointments]);

  const toDate = (a: Appt): Date | null => {
    if (!a.date || !a.time) return null;
    const [y, m, d] = a.date.split('-').map(Number);
    const [hh, rest] = (a.time || '12:00 PM').split(':');
    let h = parseInt(hh, 10) || 0;
    const [mmStr, ampm] = rest.trim().split(' ');
    const mm = parseInt(mmStr, 10) || 0;
    if ((ampm || '').toUpperCase() === 'PM' && h < 12) h += 12;
    if ((ampm || '').toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(y, (m || 1) - 1, d || 1, h, mm, 0);
  };

  const nextUpcoming = useMemo(() => {
    const future = upcoming
      .map(a => ({ a, dt: toDate(a) }))
      .filter(x => x.dt && x.dt.getTime() >= Date.now())
      .sort((x, y) => (x.dt!.getTime() - y.dt!.getTime()));
    return future[0]?.a || null;
  }, [upcoming]);

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

  // ---- Rating helpers ----
  const setDraft = (id: string, patch: Partial<DraftRating>) =>
    setDraftRatings(prev => ({ ...prev, [id]: { rating: prev[id]?.rating || 0, review: prev[id]?.review || '', ...patch } }));

  const submitRating = async (a: Appt) => {
    const draft = draftRatings[a.id];
    if (!draft || !draft.rating) {
      alert('Please select a star rating.');
      return;
    }
    try {
      await updateDoc(doc(db, 'appointments', a.id), {
        rating: draft.rating,
        review: (draft.review || '').trim(),
        ratedAt: new Date().toISOString()
      });
      setAppointments(prev => prev.map(x => x.id === a.id ? { ...x, rating: draft.rating, review: (draft.review||'').trim(), ratedAt: new Date().toISOString() } : x));
      setDraftRatings(prev => { const { [a.id]: _, ...rest } = prev; return rest; });
    } catch (e: any) {
      alert(e?.message || 'Failed to submit rating.');
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard...</p>;

  return (
    <div className="app-container" style={{ padding: '2rem 1rem' }}>
      {/* HOME / HERO */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 6 }}>Welcome, {name}</div>
            <div className="small-muted">
              {role === 'patient'
                ? <>Manage appointments, discover doctors, and keep track of your care.</>
                : <>Review requests, confirm visits, and view your upcoming schedule.</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div><strong>Upcoming:</strong> {counts.totalUpcoming}</div>
            <div className="small-muted">Pending: {counts.pending}</div>
            <div className="small-muted">Confirmed: {counts.confirmed}</div>
            <div className="small-muted">Completed: {counts.completed}</div>
          </div>
        </div>

        {/* Next appointment highlight (patient view) */}
        {role === 'patient' && (
          <div style={{ marginTop: 12 }}>
            {nextUpcoming ? (
              <div className="card" style={{ background: '#f8fafc' }}>
                <div><strong>Next appointment:</strong> {nextUpcoming.date} at {nextUpcoming.time}</div>
                <div className="small-muted">
                  {nextUpcoming.doctorName || 'Doctor'} {nextUpcoming.clinicName ? `— ${nextUpcoming.clinicName}` : ''}
                  {nextUpcoming.status ? ` • ${nextUpcoming.status}` : ''}
                </div>
                <div className="card-actions" style={{ marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={() => nav('/dashboard/find-doctors')}>Find another doctor</button>
                </div>
              </div>
            ) : (
              <div className="card" style={{ background: '#f8fafc' }}>
                <div><strong>No upcoming appointment.</strong></div>
                <div className="small-muted">Browse doctors and book a visit.</div>
                <div className="card-actions" style={{ marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={() => nav('/dashboard/find-doctors')}>Find Doctors</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 0 }}>Dashboard</h2>

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

                {/* Rating UI only for completed & not yet rated */}
                {a.status === 'completed' && !a.rating && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                      <span className="small-muted">Rate your visit:</span>
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          className={`btn ${draftRatings[a.id]?.rating === n ? 'btn-primary' : ''}`}
                          onClick={() => setDraft(a.id, { rating: n })}
                          type="button"
                        >
                          {n}★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="textarea"
                      placeholder=""
                      maxLength={500}
                      value={draftRatings[a.id]?.review || ''}
                      onChange={e => setDraft(a.id, { review: e.target.value })}
                    />
                    <div className="card-actions">
                      <button className="btn btn-primary" onClick={() => submitRating(a)}>Submit rating</button>
                    </div>
                  </div>
                )}

                {/* Show rating if present */}
                {a.status === 'completed' && a.rating && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Your rating:</strong> {'★'.repeat(a.rating)}{'☆'.repeat(5 - a.rating)}
                    {a.review ? <div className="small-muted" style={{ marginTop: 4 }}><em>{a.review}</em></div> : null}
                  </div>
                )}

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
                  {a.status === 'confirmed' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => updateStatus(a.id, 'completed')}>
                        Mark as completed
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

                  {/* Show rating to doctor if present */}
                  {a.status === 'completed' && a.rating && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Patient rating:</strong> {'★'.repeat(a.rating)}{'☆'.repeat(5 - a.rating)}
                      {a.review ? <div className="small-muted" style={{ marginTop: 4 }}><em>“{a.review}”</em></div> : null}
                    </div>
                  )}
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
