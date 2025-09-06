// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string>('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }
      const userId = auth.currentUser.uid;

      try {
        // fetch user profile
        const userDocSnap = await getDoc(doc(db, 'users', userId));
        if (userDocSnap.exists()) {
          const u = userDocSnap.data() as any;
          setRole(u.role || '');
          setName(u.name || auth.currentUser?.email || '');
        }

        // fetch appointments based on role
        let q;
        const userRole = userDocSnap.exists() ? (userDocSnap.data() as any).role : '';
        if (userRole === 'patient') {
          q = query(collection(db, 'appointments'), where('patientUserId', '==', userId));
        } else if (userRole === 'doctor') {
          q = query(collection(db, 'appointments'), where('doctorUserId', '==', userId));
        }

        if (q) {
          const apptSnap = await getDocs(q);
          const appts = apptSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          // populate patient names (client-side) for any appointment missing patientName
          const apptsWithNames = await hydratePatientNames(appts);
          setAppointments(apptsWithNames);
        } else {
          setAppointments([]);
        }
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    // helper: for appointments missing patientName, fetch users once and map
    const hydratePatientNames = async (appts: any[]) => {
      try {
        const missingIds = Array.from(new Set(
          appts
            .filter(a => !a.patientName && a.patientUserId)
            .map(a => a.patientUserId)
        ));

        if (missingIds.length === 0) return appts;

        // fetch user docs in parallel
        const userDocs = await Promise.all(
          missingIds.map(uid => getDoc(doc(db, 'users', uid)))
        );

        const idToName: Record<string, string> = {};
        userDocs.forEach((uSnap, idx) => {
          if (uSnap.exists()) {
            const data = uSnap.data() as any;
            idToName[missingIds[idx]] = data.name || data.email || missingIds[idx];
          } else {
            idToName[missingIds[idx]] = missingIds[idx]; // fallback to id
          }
        });

        // return new array with patientName filled in (client-side only)
        return appts.map(a => ({
          ...a,
          patientName: a.patientName || (a.patientUserId ? idToName[a.patientUserId] : a.patientName)
        }));
      } catch (err) {
        console.error('Failed to hydrate patient names', err);
        return appts;
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper to sort by createdAt desc (newest first). fallback uses date/time string
  const sortNewestFirst = (list: any[]) => {
    return list.slice().sort((a, b) => {
      const aKey = a.createdAt || (a.date ? (a.date + ' ' + (a.time || '')) : '');
      const bKey = b.createdAt || (b.date ? (b.date + ' ' + (b.time || '')) : '');
      if (aKey > bKey) return -1;
      if (aKey < bKey) return 1;
      return 0;
    });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { status: newStatus });
      setAppointments(prev => prev.map(a => (a.id === id ? { ...a, status: newStatus } : a)));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update appointment status.');
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading dashboard...</p>;

  // split upcoming vs history
  const upcoming = sortNewestFirst(appointments.filter(a => a.status === 'pending' || a.status === 'confirmed'));
  const history = sortNewestFirst(appointments.filter(a => a.status === 'canceled' || a.status === 'completed'));

  return (
    <div className="app-container" style={{ padding: '2rem 1rem' }}>
      <h2>Dashboard</h2>
      <p>Welcome, {name}!</p>

      {/* Patient-only Find Doctors button */}
      {role === 'patient' && (
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/find-doctors')}>
            Find Doctors
          </button>
        </div>
      )}

      {/* Patient view */}
      {role === 'patient' && (
        <section>
          <h3>Your Appointments</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            upcoming.map((appt) => (
              <div key={appt.id} className="card" style={{ marginBottom: 12 }}>
                <div><strong>Doctor:</strong> {appt.doctorName || '—'} {appt.clinicName ? `— ${appt.clinicName}` : ''}</div>
                <div><strong>Date:</strong> {appt.date || appt.day || '—'} | <strong>Time:</strong> {appt.time || '—'}</div>
                <div><strong>Status:</strong> {appt.status}</div>
                {appt.reason && <div><strong>Reason:</strong> {appt.reason}</div>}

                {/* Patient cancel before confirmation */}
                {appt.status === 'pending' && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (!window.confirm('Cancel this appointment?')) return;
                        updateStatus(appt.id, 'canceled');
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
            history.map((appt) => (
              <div key={appt.id} className="card" style={{ marginBottom: 12 }}>
                <div><strong>Doctor:</strong> {appt.doctorName || '—'} {appt.clinicName ? `— ${appt.clinicName}` : ''}</div>
                <div><strong>Date:</strong> {appt.date || appt.day || '—'} | <strong>Time:</strong> {appt.time || '—'}</div>
                <div><strong>Status:</strong> {appt.status}</div>
                {appt.reason && <div><strong>Reason:</strong> {appt.reason}</div>}
              </div>
            ))
          )}
        </section>
      )}

      {/* Doctor view */}
      {role === 'doctor' && (
        <section style={{ marginTop: 12 }}>
          <h3>Upcoming Appointments</h3>

          {upcoming.length === 0 ? (
            <p>No upcoming appointments.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {upcoming.map((appt) => (
                <li key={appt.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {appt.date || appt.day || '—'} at <strong>{appt.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {appt.status}</div>
                  <div><strong>Patient:</strong> {appt.patientName || appt.patientUserId || '—'}</div>
                  {appt.reason && <div><em>Reason:</em> {appt.reason}</div>}

                  {appt.status === 'pending' && (
                    <div style={{ marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => updateStatus(appt.id, 'confirmed')} style={{ marginRight: 8 }}>
                        Confirm
                      </button>
                      <button className="btn btn-danger" onClick={() => updateStatus(appt.id, 'canceled')}>
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
              {history.map((appt) => (
                <li key={appt.id} className="card" style={{ marginBottom: 12 }}>
                  <div><strong>Appointment on</strong> {appt.date || appt.day || '—'} at <strong>{appt.time || '—'}</strong></div>
                  <div><strong>Status:</strong> {appt.status}</div>
                  <div><strong>Patient:</strong> {appt.patientName || appt.patientUserId || '—'}</div>
                  {appt.reason && <div><em>Reason:</em> {appt.reason}</div>}
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
