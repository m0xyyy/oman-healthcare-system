import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Saturday'];  // Removed Friday
const TIMES = ['10:00 AM','12:00 PM','2:00 PM','4:00 PM'];

const HOLIDAYS_2025 = [
  '2025-01-01', '2025-01-11', '2025-01-27',
  '2025-03-29', '2025-03-30', '2025-03-31', '2025-04-01',
  '2025-06-05', '2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09',
  '2025-06-26', '2025-09-05',
  '2025-11-18', '2025-11-19'
];

const BookDoctor: React.FC = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');

  const getNextDateForDay = (dayName: string) => {
    const map: Record<string, number> = { Sunday:0, Monday:1, Tuesday:2, Wednesday:3, Thursday:4, Friday:5, Saturday:6 };
    const today = new Date();
    const target = map[dayName];
    let diff = target - today.getDay();
    if (diff <= 0) diff += 7;
    let result = new Date(today);
    result.setDate(today.getDate() + diff);

    let dateStr = result.toISOString().slice(0,10);
    while (HOLIDAYS_2025.includes(dateStr) || result.getDay() === 5 /* Friday */) {
      result.setDate(result.getDate() + 1);
      dateStr = result.toISOString().slice(0,10);
    }
    return dateStr;
  };

  useEffect(() => {
    if (!doctorId) return;
    const unsub = onAuthStateChanged(auth, u => u && setUserId(u.uid));
    (async () => {
      const snap = await getDoc(doc(db, 'doctors', doctorId));
      if (snap.exists()) {
        setDoctor({ id: snap.id, ...(snap.data() as any) });
      } else {
        alert('Doctor not found.');
        navigate('/dashboard');
      }
    })();
    return () => unsub();
  }, [doctorId, navigate]);

  const handleBooking = async () => {
    if (!selectedDay || !selectedTime || !doctor || !userId) {
      alert('Select a day and time.');
      return;
    }
    const date = getNextDateForDay(selectedDay);
    const doctorUserId = doctor.userId || doctor.id || '';
    const apptId = `${doctorUserId}_${date}_${selectedTime}`;

    let patientName = '';
    try {
      const s = await getDoc(doc(db, 'users', userId));
      if (s.exists()) {
        const d = s.data() as any;
        patientName = d.name || d.email || '';
      } else {
        patientName = auth.currentUser?.email || '';
      }
    } catch {
      patientName = auth.currentUser?.email || '';
    }

    try {
      await setDoc(doc(db, 'appointments', apptId), {
        patientUserId: userId,
        patientName,
        doctorUserId,
        doctorName: doctor.name || '',
        specialty: doctor.specialty || '',
        city: doctor.city || '',
        clinicName: doctor.clinicName || '',
        language: doctor.language || '',
        day: selectedDay,
        date,
        time: selectedTime,
        reason: reason || '',
        type: 'inperson',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      alert('Appointment request sent.');
      navigate('/dashboard');
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        alert('This slot is already booked. Please choose another time.');
      } else {
        alert(e?.message || 'Something went wrong. Please try again.');
      }
    }
  };

  if (!doctor) {
    return (
      <div className="app-container">
        <p>Loading doctor...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h2>Book Appointment</h2>
      <div className="card">
        <div className="card-title">{doctor.name}</div>
        <div className="small-muted">Specialty: {doctor.specialty}</div>
        <div className="small-muted">City: {doctor.city || 'N/A'}</div>
        <div className="small-muted">Clinic: {doctor.clinicName || '—'}</div>
        <div className="small-muted">Language: {doctor.language}</div>
      </div>
      <div className="card">
        <div className="form-row">
          <div className="small-muted">Select Day:</div>
          <div className="row">
            {DAYS.map(d => (
              <button
                key={d}
                className={`btn ${selectedDay === d ? 'btn-primary' : ''}`}
                onClick={() => setSelectedDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <div className="small-muted">Select Time:</div>
          <div className="row">
            {TIMES.map(t => (
              <button
                key={t}
                className={`btn ${selectedTime === t ? 'btn-primary' : ''}`}
                onClick={() => setSelectedTime(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <label className="small-muted">Reason for Visit:</label>
          <textarea
            className="textarea"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Briefly describe your reason"
          />
        </div>
        <div className="card-actions">
          <button className="btn btn-primary" onClick={handleBooking}>
            Confirm Appointment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDoctor;