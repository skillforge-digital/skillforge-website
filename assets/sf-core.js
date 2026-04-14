﻿﻿/**
 * SkillForge Core Engine (v2.0.0)
 * Unified Tracking, Identity, and Neural Sync
 * Replaces: presence.js, academy-tracker.js, presence_site.js
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, onSnapshot, addDoc, collection } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const firebaseConfig = { 
  apiKey: "AIzaSyAODtfZDqeR8DH7YRaiDlRwPOBlxxMfFnY", 
  authDomain: "skillfoge-ecosystem.firebaseapp.com", 
  projectId: "skillfoge-ecosystem", 
  storageBucket: "skillfoge-ecosystem.firebasestorage.app", 
  messagingSenderId: "279055501952", 
  appId: "1:279055501952:web:45e741d2e8b23af698f465", 
  measurementId: "G-YZNF8273RC" 
};

class SkillForgeCore {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        
        this.uid = localStorage.getItem('skillforge_mock_uid');
        this.sessionStart = Date.now();
        this.isTracking = false;
        this.lastPulse = Date.now();
        
        this.init();
        
        // Zero-Refresh Engine (PJAX) Integration
        window.addEventListener('turbo:load', () => {
            console.log("[NeuralCore] Turbo Load: Re-initializing registry listeners");
            this.uid = localStorage.getItem('skillforge_mock_uid');
            this.syncRegistryState();
        });
    }

    init() {
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.uid = localStorage.getItem('skillforge_mock_uid') || user.uid;
                console.log(`[NeuralCore] Session verified for: ${this.uid}`);
                this.syncRegistryState();
            } else {
                console.warn("[NeuralCore] No session detected. Initializing anonymous connection...");
                signInAnonymously(this.auth).catch(err => {
                    console.error("[NeuralCore] Auth failed:", err);
                });
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stopPulse();
            else this.startPulse();
        });

        window.addEventListener('beforeunload', () => this.pulse());
    }

    async syncRegistryState() {
        if (!this.uid) return;

        const path = window.location.pathname;
        const isAcademyTrack = path.includes('/academy/') && 
                              !path.endsWith('/academy/') && 
                              !path.endsWith('/academy/index.html') &&
                              !path.includes('gate.html');

        if (isAcademyTrack) {
            const trackId = this.getCurrentTrack();
            const hasPasscodeSession = this.verifyPasscodeSession(trackId);

            if (hasPasscodeSession) {
                console.log(`[NeuralCore] Academy Access Confirmed: ${trackId}. Activating Trackers.`);
                this.startNeuralSync();
                this.handleAcademyActivity();
                this.trackCurrentLesson();
            } else {
                console.log("[NeuralCore] Academy track detected but no active passcode session. Tracking suspended.");
            }
        } else {
            console.log("[NeuralCore] Outside Academy Scope. Neural trackers in standby.");
            this.stopPulse();
        }
    }

    getCurrentTrack() {
        const parts = window.location.pathname.split('/').filter(p => p);
        const academyIdx = parts.indexOf('academy');
        return (academyIdx !== -1 && parts.length > academyIdx + 1) ? parts[academyIdx + 1] : null;
    }

    verifyPasscodeSession(trackId) {
        if (!trackId) return false;
        const name = `sf_gate_session_${trackId}`;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const token = parts.pop().split(';').shift();
            try {
                const [fingerprint, timestamp] = atob(token).split('|');
                // Check if session is less than 24 hours old
                return (Date.now() - parseInt(timestamp)) < 24 * 60 * 60 * 1000;
            } catch (e) { return false; }
        }
        return false;
    }

    async handleAcademyActivity() {
        if (!this.uid) return;
        const today = new Date().toISOString().split('T')[0];
        const trackRef = doc(this.db, 'tracking', this.uid);
        const traineeRef = doc(this.db, 'trainees', this.uid);

        // This tracks Academy Login Days and Total Academy Accesses
        const snap = await getDoc(trackRef);
        const data = snap.exists() ? snap.data() : { lastAcademyAccess: '', academyLoginDays: 0 };

        if (data.lastAcademyAccess !== today) {
            console.log("[NeuralCore] New Academy Day Access detected.");
            await setDoc(trackRef, {
                lastAcademyAccess: today,
                academyLoginDays: increment(1),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            await updateDoc(traineeRef, {
                totalLogins: increment(1) // Renamed internally to Academy Logins per user requirement
            });
        }
    }

    async trackCurrentLesson() {
        if (!this.uid || !window.location.pathname.includes('/academy/')) return;
        
        const track = this.getCurrentTrack();
        const lesson = window.location.pathname.split('/').slice(-2, -1)[0]; // Simplified lesson extraction
        if (!lesson || lesson === track) return;

        console.log(`[NeuralCore] Tracking: ${track} > ${lesson}`);
        const traineeRef = doc(this.db, 'trainees', this.uid);
        try {
            const snap = await getDoc(traineeRef);
            if (snap.exists()) {
                const data = snap.data();
                const completed = data.completedLessons || [];
                const lessonId = `${track}:${lesson}`;
                
                if (!completed.includes(lessonId)) {
                    await updateDoc(traineeRef, {
                        completedLessons: [...completed, lessonId],
                        lastLesson: { track, lesson, timestamp: Date.now() }
                    });
                } else {
                    await updateDoc(traineeRef, {
                        lastLesson: { track, lesson, timestamp: Date.now() }
                    });
                }
            }
        } catch (err) { console.error("[NeuralCore] Track Error:", err); }
    }

    async startNeuralSync() {
        if (this.isTracking) return;
        this.isTracking = true;
        this.lastPulse = Date.now();
        
        // Pulse every 60 seconds
        this.pulseInterval = setInterval(() => this.pulse(), 60000);
        
        // Check for Birthday
        const snap = await getDoc(doc(this.db, 'trainees', this.uid));
        if (snap.exists()) {
            this.checkBirthday(snap.data());
        }
    }

    stopPulse() {
        if (!this.isTracking) return;
        this.pulse();
        clearInterval(this.pulseInterval);
        this.isTracking = false;
    }

    startPulse() {
        if (this.isTracking) return;
        this.lastPulse = Date.now();
        this.startNeuralSync();
    }

    async pulse() {
        if (!this.uid || !this.isTracking) return;
        
        const path = window.location.pathname;
        const isAcademyLesson = path.includes('/academy/') && 
                                !path.endsWith('/academy/') && 
                                !path.endsWith('/academy/index.html');
        
        if (!isAcademyLesson) {
            console.log("[NeuralCore] Pulse skipped: Not in a verified Academy Lesson track.");
            return;
        }

        const now = Date.now();
        const elapsed = now - this.lastPulse;
        this.lastPulse = now;
        
        const minutes = Math.floor(elapsed / 60000);
        if (minutes < 1 && elapsed < 30000) return; 

        const now_date = new Date();
        const todayDate = now_date.toISOString().split('T')[0];
        const dayName = now_date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthName = now_date.toLocaleDateString('en-US', { month: 'long' });
        const currentHour = now_date.getHours();
        
        // Calculate Week Number
        const startOfYear = new Date(now_date.getFullYear(), 0, 1);
        const pastDaysOfYear = (now_date - startOfYear) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
        const weekKey = `${now_date.getFullYear()}-W${weekNumber}`;

        const trackId = this.getCurrentTrack();
        
        const traineeRef = doc(this.db, 'trainees', this.uid);
        const presenceRef = doc(this.db, 'presence', this.uid);

        try {
            await addDoc(collection(this.db, "academy_audit_logs"), {
                uid: this.uid,
                path: path,
                trackId: trackId,
                timestamp: serverTimestamp(),
                elapsed: elapsed,
                type: 'ACADEMY_PULSE'
            });

            const batch = {
                lastActive: now,
                totalTime: increment(elapsed),
                [`dailyStats.${todayDate}.timeSpent`]: increment(elapsed),
                [`dailyStats.${todayDate}.day`]: dayName,
                [`dailyStats.${todayDate}.month`]: monthName,
                [`dailyStats.${todayDate}.tracks.${trackId}`]: increment(elapsed),
                [`weeklyStats.${weekKey}`]: increment(elapsed),
                [`hourlyStats.${currentHour}`]: increment(elapsed),
                server_lastActive: serverTimestamp()
            };

            await setDoc(presenceRef, batch, { merge: true });

            if (minutes >= 1) {
                const updateData = {
                    xp: increment(minutes),
                    totalTimeSpent: increment(elapsed)
                };

                const snap = await getDoc(presenceRef);
                if (snap.exists()) {
                    const todayTime = snap.data().dailyStats?.[todayDate]?.timeSpent || 0;
                    const lastCertUpdate = snap.data().lastCertUpdate || "";
                    if (todayTime >= 1800000 && lastCertUpdate !== todayDate) {
                        updateData.certDays = increment(1);
                        await updateDoc(presenceRef, { lastCertUpdate: todayDate });
                    }
                }

                await updateDoc(traineeRef, updateData);
                this.checkTierUpgrade(traineeRef);
            }
        } catch (err) {
            console.error("[NeuralCore] Pulse Failed:", err);
        }
    }

    async checkTierUpgrade(ref) {
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        const xp = data.xp || 0;
        const currentLevel = Math.floor(xp / 1000) + 1;
        const lastLevel = data.lastNotifiedLevel || 1;

        // 1. Tier Upgrade Logic
        let tier = 'Novice';
        if (xp >= 5000) tier = 'Intermediate';
        else if (xp >= 2500) tier = 'Beginner';
        else if (xp >= 1000) tier = 'Starter';

        if (data.tier !== tier) {
            await updateDoc(ref, { tier: tier });
            console.log(`[NeuralCore] Tier Upgraded to ${tier}!`);
        }

        // 2. Level Milestone Logic
        if (currentLevel > lastLevel) {
            console.log(`[NeuralCore] Level Milestone Reached: ${currentLevel}`);
            await updateDoc(ref, { lastNotifiedLevel: currentLevel });
            this.showMilestoneModal(currentLevel, tier);
        }
    }

    showMilestoneModal(level, tier) {
        if (document.getElementById('milestone-modal')) return;
        const modalHtml = `
        <div id="milestone-modal" class="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-navy/95 backdrop-blur-2xl">
            <div class="relative max-w-xl w-full bg-navy border border-gold/30 rounded-[50px] p-12 text-center shadow-4K overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent opacity-50"></div>
                <div class="relative z-10">
                    <div class="w-28 h-28 bg-gradient-to-br from-gold to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce">
                        <i class="fa-solid fa-bolt-lightning text-5xl text-navy"></i>
                    </div>
                    <p class="text-gold font-black uppercase tracking-[0.5em] text-[10px] mb-4">Neural Advancement Detected</p>
                    <h2 class="text-5xl font-black text-white mb-6 uppercase tracking-tighter">Level ${level} <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Reached</span></h2>
                    <div class="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-gold/10 border border-gold/20 mb-10">
                        <span class="text-gold text-[10px] font-black uppercase tracking-widest">${tier} Status Confirmed</span>
                    </div>
                    <button onclick="document.getElementById('milestone-modal').remove()" class="w-full py-6 bg-white text-navy font-black rounded-3xl uppercase text-xs tracking-[0.3em] shadow-xl hover:bg-gold transition-all transform hover:scale-105 active:scale-95">Acknowledge Evolution</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    checkBirthday(data) {
        if (!data.dob) return;
        const today = new Date();
        const [d, m] = data.dob.split('/').map(Number);
        if (today.getDate() === d && (today.getMonth() + 1) === m) {
            this.showBirthdayModal(data.name);
        }
    }

    showBirthdayModal(name) {
        if (document.getElementById('birthday-modal')) return;
        const modalHtml = `
        <div id="birthday-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy/90 backdrop-blur-xl">
            <div class="relative max-w-lg w-full bg-gradient-to-br from-gold/20 to-navy border border-gold/30 rounded-[40px] p-12 text-center shadow-2xl overflow-hidden">
                <div class="w-24 h-24 bg-gold rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <i class="fa-solid fa-gift text-4xl text-navy"></i>
                </div>
                <h2 class="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Happy Birthday, <br><span class="text-gold">${name.split(' ')[0]}</span>!</h2>
                <p class="text-slate-300 text-sm font-medium mb-10 uppercase tracking-widest">A gift from the SkillForge Command Center awaits you.</p>
                <button onclick="document.getElementById('birthday-modal').remove()" class="w-full py-6 bg-gold text-navy font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-white transition-all">Claim Neural Gift</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

// Compatibility Aliases for Legacy Code
window.startRealtimePresence = () => {
    console.log("[NeuralCore] startRealtimePresence called (Legacy Alias)");
    if (window.sfCore) window.sfCore.pulse();
};
export default SkillForgeCore;
export const sfCore = new SkillForgeCore();
window.sfCore = sfCore;
