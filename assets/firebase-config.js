import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAODtfZDqeR8DH7YRaiDlRwPOBlxxMfFnY",
  authDomain: "skillfoge-ecosystem.firebaseapp.com",
  projectId: "skillfoge-ecosystem",
  storageBucket: "skillfoge-ecosystem.firebasestorage.app",
  messagingSenderId: "279055501952",
  appId: "1:279055501952:web:45e741d2e8b23af698f465",
  measurementId: "G-YZNF8273RC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;