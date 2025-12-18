import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';

const Navbar: React.FC = () => {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<{ name?: string; roles?: string[]; role?: string } | null>(null); // Added role?: string for old docs
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (mounted) setProfile(snap.exists() ? (snap.data() as any) : null);
      } catch (e) {
        console.error('Failed to fetch profile', e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setProfileLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  if (!user) return null;

  const hide = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/apply-doctor';
  if (hide) return null;

  const display = profile?.name || user.email || 'Account';
  const roles = profile?.roles || (profile?.role ? [profile.role] : ['patient']); // Handle old 'role'

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

        {profileLoaded && roles.includes('patient') && (
          <>
            <Link to="/dashboard/find-doctors" style={{ marginLeft: 12 }}>Find Doctors</Link>
            <Link to="/dashboard/symptom-checker" style={{ marginLeft: 12 }}>Symptom Checker</Link>
          </>
        )}

        <Link to="/dashboard" style={{ marginLeft: 12 }}>My Appointments</Link>
      </div>

      <div className="nav-right" ref={menuRef} style={{ position: 'relative' }}>
        <button className="user-btn" onClick={() => setOpen(v => !v)}>
          {display} <span style={{ marginLeft: 8, fontSize: 11, color: '#666' }}>{profileLoaded ? roles.join(', ') : '...'}</span>
        </button>

        {open && (
          <div
            className="nav-dropdown"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: 8,
              minWidth: 180,
              boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
              zIndex: 50,
              padding: 8
            }}
          >
            {profileLoaded && roles.includes('patient') && (
              <>
                <div onClick={() => { setOpen(false); navigate('/dashboard/find-doctors'); }} style={{ padding: '8px 10px', cursor: 'pointer' }}>
                  Find Doctors
                </div>
                <div onClick={() => { setOpen(false); navigate('/dashboard/symptom-checker'); }} style={{ padding: '8px 10px', cursor: 'pointer' }}>
                  Symptom Checker
                </div>
              </>
            )}

            <div onClick={() => { setOpen(false); navigate('/dashboard'); }} style={{ padding: '8px 10px', cursor: 'pointer' }}>
              My Appointments
            </div>

            <div onClick={handleDeletion} style={{ padding: '8px 10px', cursor: 'pointer' }}>
              Request Data Deletion
            </div>

            <div style={{ height: 1, background: '#f2f4f7', margin: '8px 0' }} />

            <div
              onClick={async () => { setOpen(false); handleLogout(); }}
              style={{ padding: '8px 10px', cursor: 'pointer', color: '#c0392b' }}
            >
              Logout
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;