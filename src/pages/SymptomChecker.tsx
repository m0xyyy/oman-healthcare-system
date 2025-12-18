import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Symptom → { Specialty: weight }
 * - Specific specialties get higher weights.
 * - "General" gets a small weight so it's shown only when nothing specific matches.
 *   We'll also penalize General if any specific specialty has score > 0.
 */
const MAP: Record<string, Record<string, number>> = {
  // General / constitutional
  'Fever':            { General: 0.6 },
  'Fatigue':          { General: 0.6 },
  'Weight Loss':      { General: 0.6 },
  'Night Sweats':     { General: 0.6 },
  'Loss of Appetite': { General: 0.6 },

  // Neuro
  'Headache':  { Neurology: 1.2, General: 0.4 },
  'Dizziness': { Neurology: 1.0, General: 0.4 },
  'Confusion': { Neurology: 1.4 },

  // Respiratory / ENT / Pulmonology
  'Cough':               { Pulmonology: 1.0, ENT: 0.6, General: 0.3 },
  'Shortness of Breath': { Pulmonology: 1.5, Cardiology: 0.8 },
  'Wheezing':            { Pulmonology: 1.4 },
  'Sore Throat':         { ENT: 1.2 },

  // Cardio
  'Chest Pain':      { Cardiology: 1.6, Pulmonology: 0.6 },
  'Chest Tightness': { Cardiology: 1.2 },
  'Palpitations':    { Cardiology: 1.3 },
  'Swollen Legs':    { Cardiology: 1.0 },

  // GI
  'Nausea':         { Gastroenterology: 1.0, General: 0.3 },
  'Vomiting':       { Gastroenterology: 1.3 },
  'Diarrhea':       { Gastroenterology: 1.3 },
  'Constipation':   { Gastroenterology: 1.2 },
  'Abdominal Pain': { Gastroenterology: 1.4 },

  // MSK / Rheum
  'Joint Pain': { Orthopedics: 1.0, Rheumatology: 0.9 },
  'Back Pain':  { Orthopedics: 1.2 },
  'Stiffness':  { Rheumatology: 1.0 },

  // Derm
  'Rash':             { Dermatology: 1.6 },
  'Itching':          { Dermatology: 1.2 },
  'Skin Discoloration': { Dermatology: 1.2 },
  // Add more for Ophthalmology, Pediatrics if needed, but current is fine
};

const GROUPS: { title: string; items: string[] }[] = [
  { title: 'General', items: ['Fever', 'Fatigue', 'Weight Loss', 'Night Sweats', 'Loss of Appetite'] },
  { title: 'Head & Neurological', items: ['Headache', 'Dizziness', 'Confusion'] },
  { title: 'Respiratory', items: ['Cough', 'Shortness of Breath', 'Wheezing', 'Sore Throat'] },
  { title: 'Cardiovascular', items: ['Chest Pain', 'Chest Tightness', 'Palpitations', 'Swollen Legs'] },
  { title: 'Digestive', items: ['Nausea', 'Vomiting', 'Diarrhea', 'Constipation', 'Abdominal Pain'] },
  { title: 'Musculoskeletal', items: ['Joint Pain', 'Back Pain', 'Stiffness'] },
  { title: 'Skin', items: ['Rash', 'Itching', 'Skin Discoloration'] },
];

type Scores = {
  bySpecialty: Record<string, number>;
  reasons: Record<string, string[]>; // specialty -> which symptoms contributed
};

const SymptomChecker: React.FC = () => {
  const nav = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const scores: Scores = useMemo(() => {
    const by: Record<string, number> = {};
    const reasons: Record<string, string[]> = {};
    selected.forEach(sym => {
      const weights = MAP[sym] || {};
      Object.entries(weights).forEach(([spec, w]) => {
        // small specificity bonus for non-General
        const bonus = spec === 'General' ? 0 : 0.1;
        by[spec] = (by[spec] || 0) + (w + bonus);
        if (!reasons[spec]) reasons[spec] = [];
        reasons[spec].push(sym);
      });
    });

    // Penalize General if any specific specialty has a non-zero score
    const hasSpecific = Object.keys(by).some(k => k !== 'General' && by[k] > 0);
    if (hasSpecific && by['General'] != null) {
      by['General'] = by['General'] * 0.6;
    }

    return { bySpecialty: by, reasons };
  }, [selected]);

  const ranked = useMemo(() => {
    const entries = Object.entries(scores.bySpecialty)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) return [];

    // Drop 'General' if a specific specialty ties or beats it
    const topVal = entries[0][1];
    const cleaned = entries.filter(([k, v]) => {
      if (k !== 'General') return true;
      const someoneBeatsGeneral = entries.some(([kk, vv]) => kk !== 'General' && vv >= v);
      return !someoneBeatsGeneral;
    });

    // Keep top 3 max
    return (cleaned.length ? cleaned : entries).slice(0, 3);
  }, [scores]);

  const toggle = (sym: string) =>
    setSelected(prev => prev.includes(sym) ? prev.filter(x => x !== sym) : [...prev, sym]);

  return (
    <div className="app-container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Symptom Checker (Guidance Only)</div>
        <p className="small-muted">
          Select symptoms to see suggested specialties. This is NOT a diagnosis. For severe symptoms,
          seek urgent care immediately.
        </p>
      </div>

      {!done && (
        <>
          {GROUPS.map(g => (
            <div key={g.title} className="card" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>{g.title}</div>
              <div className="row">
                {g.items.map(item => (
                  <label key={item} className="btn" style={{
                    userSelect: 'none',
                    background: selected.includes(item) ? '#e7f0ff' : '#fff'
                  }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item)}
                      onChange={() => toggle(item)}
                      style={{ marginRight: 8 }}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="card-actions">
            <button className="btn btn-primary" onClick={() => setDone(true)} disabled={selected.length === 0}>
              Analyze
            </button>
          </div>
        </>
      )}

      {done && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Suggested specialties</div>

          {ranked.length === 0 ? (
            <p className="small-muted">No clear match. Consider a <strong>General</strong> practitioner.</p>
          ) : (
            <ol style={{ paddingLeft: 18, marginTop: 0 }}>
              {ranked.map(([spec]) => (
                <li key={spec} style={{ marginBottom: 8 }}>
                  <strong>{spec}</strong>
                  {scores.reasons[spec]?.length ? (
                    <div className="small-muted">
                      matched: {scores.reasons[spec].join(', ')}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          <div className="card-actions">
            <button className="btn btn-primary" onClick={() => nav('/dashboard/find-doctors')}>Find Doctors</button>
            <button className="btn" onClick={() => { setSelected([]); setDone(false); }}>
              Start Over
            </button>
          </div>

          <p className="small-muted" style={{ marginTop: 8 }}>
            Your selections are processed only in your browser and not stored.
          </p>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;