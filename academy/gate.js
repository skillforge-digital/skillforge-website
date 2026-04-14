/**
 * SkillForge Academy Access Gate
 * Intercepts track requests and verifies cryptographic pass-codes.
 */

import { PassCodeEngine } from '../../../assets/pass-code-engine.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';

const firebaseConfig = { 
  apiKey: "AIzaSyAODtfZDqeR8DH7YRaiDlRwPOBlxxMfFnY", 
  authDomain: "skillfoge-ecosystem.firebaseapp.com", 
  projectId: "skillfoge-ecosystem", 
  storageBucket: "skillfoge-ecosystem.firebasestorage.app", 
  messagingSenderId: "279055501952", 
  appId: "1:279055501952:web:45e741d2e8b23af698f465", 
  measurementId: "G-YZNF8273RC" 
};

class AccessGate {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.init();
    }

    async init() {
        if (!this.auth.currentUser) {
            await signInAnonymously(this.auth);
        }
        this.checkAccess();
    }

    async getFingerprint() {
        const ua = navigator.userAgent;
        const screen = `${window.screen.width}x${window.screen.height}`;
        const lang = navigator.language;
        const vendor = navigator.vendor;
        const str = `${ua}|${screen}|${lang}|${vendor}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async checkAccess() {
        let uid = localStorage.getItem('skillforge_mock_uid');
        
        // Fallback: Check cross-subdomain cookie if localStorage is empty (e.g. on marketing domain)
        if (!uid) {
            const cookieUid = this.getCookie('sf_uid');
            if (cookieUid) {
                uid = cookieUid;
                localStorage.setItem('skillforge_mock_uid', uid);
            }
        }

        const currentPath = window.location.pathname;
        
        // Don't gate the gate page or the academy index
        if (currentPath.includes('gate.html') || currentPath.endsWith('/academy/') || currentPath.endsWith('/academy/index.html')) {
            return;
        }

        if (!uid) {
            window.location.href = 'https://portal.skillforgedigital.com.ng/trainee-login/';
            return;
        }

        const currentTrack = this.getCurrentTrack();
        if (!currentTrack) return;

        const fingerprint = await this.getFingerprint();
        const sessionKey = `sf_gate_session_${currentTrack}`;
        const sessionToken = this.getCookie(sessionKey);

        if (sessionToken) {
            // Verify session token (in a real app, this would be a JWT or similar)
            // Here we just check if it matches the fingerprint
            const [storedFingerprint, timestamp] = atob(sessionToken).split('|');
            const sessionAge = Date.now() - parseInt(timestamp);
            
            if (storedFingerprint === fingerprint && sessionAge < 24 * 60 * 60 * 1000) {
                console.log("[AccessGate] Secure fingerprint match confirmed.");
                return;
            }
        }

        // Check if user is already locked to another track
        const traineeRef = doc(this.db, 'trainees', uid);
        const traineeSnap = await getDoc(traineeRef);
        
        if (traineeSnap.exists()) {
            const data = traineeSnap.data();
            if (data.fingerprint_locked && data.locked_track !== currentTrack) {
                alert("ACCESS VIOLATION: This mastery record is already locked to another track. Multiple track registration is strictly prohibited.");
                window.location.href = 'https://portal.skillforgedigital.com.ng/trainee-dashboard/';
                return;
            }
        }

        // No valid session, redirect to pass-code entry
        const base = currentPath.split('/academy/')[0] || '';
        window.location.href = `${base}/academy/gate.html?track=${currentTrack}&return=${encodeURIComponent(currentPath)}`;
    }

    getCurrentTrack() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(p => p);
        const academyIdx = parts.indexOf('academy');
        if (academyIdx !== -1 && parts.length > academyIdx + 1) {
            return parts[academyIdx + 1];
        }
        return null;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
}

new AccessGate();
