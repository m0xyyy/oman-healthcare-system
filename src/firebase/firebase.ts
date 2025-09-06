import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDFHsF-zCv9G29bD-80oaZQzRIXbXIf2AY",
  authDomain: "healthcare-8b795.firebaseapp.com",
  projectId: "healthcare-8b795",
  storageBucket: "healthcare-8b795.appspot.com",
  messagingSenderId: "811508729337",
  appId: "1:811508729337:web:6af78fda86a43de8a2e928",
  measurementId: "G-JXRXESDBYY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export {}; 
