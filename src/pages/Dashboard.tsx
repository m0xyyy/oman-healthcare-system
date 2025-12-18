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
  const [roles, setRoles] = useState<string[]>(['patient']);
  const [name, setName] = useState('');
  const [appointmentsAsPatient, setAppointmentsAsPatient] = useState<Appt[]>([]);
  const [appointmentsAsDoctor, setAppointmentsAsDoctor] = useState<Appt[]>([]);
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
        const userData = u.data() as any;
        const r = userData?.roles || (userData?.role ? [userData.role] : ['patient']);
        setRoles(r);
        setName(userData?.name || auth.currentUser.email || '');

        const patientQ = query(collection(db, 'appointments'), where('patientUserId', '==', uid));
        const patientSnap = await getDocs(patientQ);
        setAppointmentsAsPatient(patientSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));

        if (r.includes('doctor')) {
          const doctorQ = query(collection(db, 'appointments'), where('doctorUserId', '==', uid));
          const doctorSnap = await getDocs(doctorQ);
          setAppointmentsAsDoctor(doctorSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
        setAppointmentsAsPatient([]);
        setAppointmentsAsDoctor([]);
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

  const patientUpcoming = useMemo(
    () => sortNewestFirst(appointmentsAsPatient.filter(a => a.status === 'pending' || a.status === 'confirmed')),
    [appointmentsAsPatient]
  );
  const patientHistory = useMemo(
    () => sortNewestFirst(appointmentsAsPatient.filter(a => a.status === 'canceled' || a.status === 'completed')),
    [appointmentsAsPatient]
  );

  const doctorUpcoming = useMemo(
    () => sortNewestFirst(appointmentsAsDoctor.filter(a => a.status === 'pending' || a.status === 'confirmed')),
    [appointmentsAsDoctor]
  );
  const doctorHistory = useMemo(
    () => sortNewestFirst(appointmentsAsDoctor.filter(a => a.status === 'canceled' || a.status === 'completed')),
    [appointmentsAsDoctor]
  );

  const counts = useMemo(() => {
    const patientPending = appointmentsAsPatient.filter(a => a.status === 'pending').length;
    const patientConfirmed = appointmentsAsPatient.filter(a => a.status === 'confirmed').length;
    const patientCompleted = appointmentsAsPatient.filter(a => a.status === 'completed').length;
    const patientCanceled = appointmentsAsPatient.filter(a => a.status === 'canceled').length;
    const doctorPending = appointmentsAsDoctor.filter(a => a.status === 'pending').length;
    const doctorConfirmed = appointmentsAsDoctor.filter(a => a.status === 'confirmed').length;
    const doctorCompleted = appointmentsAsDoctor.filter(a => a.status === 'completed').length;
    const doctorCanceled = appointmentsAsDoctor.filter(a => a.status === 'canceled').length;
    return {
      patient: { pending: patientPending, confirmed: patientConfirmed, completed: patientCompleted, canceled: patientCanceled, totalUpcoming: patientPending + patientConfirmed },
      doctor: { pending: doctorPending, confirmed: doctorConfirmed, completed: doctorCompleted, canceled: doctorCanceled, totalUpcoming: doctorPending + doctorConfirmed }
    };
  }, [appointmentsAsPatient, appointmentsAsDoctor]);

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

  const nextUpcomingPatient = useMemo(() => {
    const future = patientUpcoming
      .map(a => ({ a, dt: toDate(a) }))
      .filter(x => x.dt && x.dt.getTime() >= Date.now())
      .sort((x, y) => (x.dt!.getTime() - y.dt!.getTime()));
    return future[0]?.a || null;
  }, [patientUpcoming]);

  const updateStatus = async (id: string, status: Appt['status'], asDoctor: boolean) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      if (asDoctor) {
        setAppointmentsAsDoctor(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
      } else {
        setAppointmentsAsPatient(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
      }
    } catch {
      alert('Failed to update appointment status.');
    }
  };

  const removeFromHistory = async (id: string, asDoctor: boolean) => {
    try {
      await deleteDoc(doc(db, 'appointments', id));
      if (asDoctor) {
        setAppointmentsAsDoctor(prev => prev.filter(a => a.id !== id));
      } else {
        setAppointmentsAsPatient(prev => prev.filter(a => a.id !== id));
      }
    } catch {
      alert('Failed to remove appointment.');
    }
  };

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
      setAppointmentsAsPatient(prev => prev.map(x => x.id === a.id ? { ...x, rating: draft.rating, review: (draft.review||'').trim(), ratedAt: new Date().toISOString() } : x));
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
              {roles.includes('patient') && roles.includes('doctor') ? 'Manage your patient and doctor appointments.'
                : roles.includes('patient') ? 'Manage appointments, discover doctors, and keep track of your care.'
                : 'Review requests, confirm visits, and view your upcoming schedule.'}
            </div>
          </div>

          {/* >>> Only show the counters for the roles the user actually has <<< */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {roles.includes('patient') && (
              <>
                <div><strong>Upcoming (as patient):</strong> {counts.patient.totalUpcoming}</div>
                <div className="small-muted">Pending: {counts.patient.pending}</div>
              </>
            )}
            {roles.includes('doctor') && (
              <>
                <div><strong>Upcoming (as doctor):</strong> {counts.doctor.totalUpcoming}</div>
                <div className="small-muted">Pending: {counts.doctor.pending}</div>
              </>
            )}
          </div>
        </div>

        {/* Next appointment highlight (patient view) */}
        {roles.includes('patient') && (
          <div style={{ marginTop: 12 }}>
            {nextUpcomingPatient ? (
              <div className="card" style={{ background: '#f8fafc' }}>
                <div><strong>Next appointment:</strong> {nextUpcomingPatient.date} at {nextUpcomingPatient.time}</div>
                <div className="small-muted">
                  {nextUpcomingPatient.doctorName || 'Doctor'} {nextUpcomingPatient.clinicName ? `— ${nextUpcomingPatient.clinicName}` : ''}
                  {nextUpcomingPatient.status ? ` • ${nextUpcomingPatient.status}` : ''}
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

      {roles.includes('patient') && (
        <section>
          <h3>Your Appointments</h3>
          {patientUpcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            patientUpcoming.map(a => (
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
                        updateStatus(a.id, 'canceled', false);
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
          {patientHistory.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            patientHistory.map(a => (
              <div key={a.id} className="card" style={{ marginBottom: 12 }}>
                <div><strong>Doctor:</strong> {a.doctorName || '—'} {a.clinicName ? `— ${a.clinicName}` : ''}</div>
                <div><strong>Date:</strong> {a.date || a.day || '—'} | <strong>Time:</strong> {a.time || '—'}</div>
                <div><strong>Status:</strong> {a.status}</div>
                {a.reason && <div><strong>Reason:</strong> {a.reason}</div>}

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

                {a.status === 'completed' && a.rating && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Your rating:</strong> {'★'.repeat(a.rating)}{'☆'.repeat(5 - a.rating)}
                    {a.review ? <div className="small-muted" style={{ marginTop: 4 }}><em>{a.review}</em></div> : null}
                  </div>
                )}

                {a.status === 'canceled' && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => removeFromHistory(a.id, false)}>Remove from history</button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {roles.includes('doctor') && (
        <section style={{ marginTop: 12 }}>
          <h3>Upcoming Appointments</h3>
          {doctorUpcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {doctorUpcoming.map(a => (
                <li key={a.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {a.date || a.day || '—'} at <strong>{a.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {a.status}</div>
                  <div><strong>Patient:</strong> {a.patientName || a.patientUserId || '—'}</div>
                  {a.reason && <div><em>Reason:</em> {a.reason}</div>}
                  {a.status === 'pending' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => updateStatus(a.id, 'confirmed', true)} style={{ marginRight: 8 }}>
                        Confirm
                      </button>
                      <button className="btn btn-danger" onClick={() => updateStatus(a.id, 'canceled', true)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  {a.status === 'confirmed' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => updateStatus(a.id, 'completed', true)}>
                        Mark as completed
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 style={{ marginTop: 20 }}>Appointment History</h3>
          {doctorHistory.length === 0 ? (
            <p>No past appointments.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {doctorHistory.map(a => (
                <li key={a.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {a.date || a.day || '—'} at <strong>{a.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {a.status}</div>
                  <div><strong>Patient:</strong> {a.patientName || a.patientUserId || '—'}</div>
                  {a.reason && <div><em>Reason:</em> {a.reason}</div>}

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
