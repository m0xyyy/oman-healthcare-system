// src/components/Navbar.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';

const Navbar: React.FC = () => {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<{ name?: string; role?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setProfile(snap.data() as any);
      } catch (e) { console.error(e); }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  if (!user) return null; // hide navbar when not logged in

  // hide navbar on auth pages
  const hide = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';
  if (hide) return null;

  const display = profile?.name || user.email || 'Account';
  const role = profile?.role || 'patient';

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleDeletion = async () => {
    if (!user) return alert('Please login.');
    try {
      await addDoc(collection(db, 'deletionRequests'), {
        userId: user.uid,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      });
      alert('Deletion request submitted.');
      setOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to submit request.');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="brand">Oman Health</Link>
        {/* Only show 'Find Doctors' link to patients */}
        {role === 'patient' && <Link to="/dashboard/find-doctors" style={{ marginLeft: 12 }}>Find Doctors</Link>}
        <Link to="/dashboard" style={{ marginLeft: 12 }}>My Appointments</Link>
      </div>

      <div className="nav-right" ref={menuRef} style={{ position: 'relative' }}>
        <button className="user-btn" onClick={() => setOpen(v => !v)}>
          {display} <span style={{ marginLeft:8, fontSize:11, color:'#666' }}>{role}</span>
        </button>

        {open && (
          <div className="nav-dropdown" style={{ position: 'absolute', right: 0, top: 36, background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 8, minWidth: 160, boxShadow: '0 6px 18px rgba(3,102,214,0.06)' }}>
            {/* Only show Find Doctors inside menu for patients */}
            {role === 'patient' && (
              <div style={{ padding: '8px 10px', cursor: 'pointer' }} onClick={() => { setOpen(false); navigate('/dashboard/find-doctors'); }}>Find Doctors</div>
            )}

            <div style={{ padding: '8px 10px', cursor: 'pointer' }} onClick={() => { setOpen(false); navigate('/dashboard'); }}>My Appointments</div>

            {/* Edit Profile removed by design */}

            <div style={{ padding: '8px 10px', cursor: 'pointer' }} onClick={() => { setOpen(false); handleDeletion(); }}>Request Data Deletion</div>

            <div style={{ borderTop:'1px solid #f0f2f5', marginTop:6 }} />
            <div style={{ padding:'8px 10px', cursor:'pointer', color:'#c0392b' }} onClick={handleLogout}>Logout</div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
