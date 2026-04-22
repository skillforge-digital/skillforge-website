/**
 * SkillForge Academy SSO & Passkey Auth
 * Place this on the Academy (Main Site) to allow portal users auto-access.
 * 
 * Usage:
 * 1. Include this script in gate.html
 * 2. It will automatically check for ?passkey=XXXXXX in the URL
 */

import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

export async function handleAcademySSO() {
    const urlParams = new URLSearchParams(window.location.search);
    const passkey = urlParams.get('passkey');
    const trackId = urlParams.get('track');

    if (!passkey || !trackId) return;

    console.log("[SSO] Passkey detected. Initializing auto-auth...");

    try {
        // 1. Verify Passkey (this is the 6-digit PIN or Role Code)
        const accessSnap = await getDoc(doc(db, 'track_access', passkey));

        if (!accessSnap.exists()) {
            console.warn("[SSO] Invalid Passkey provided.");
            return;
        }

        const accessData = accessSnap.data();
        
        // 2. Set Session Cookies
        const uid = accessData.uid;
        const sessionToken = btoa(`${uid}|${Date.now()}|${trackId}`);
        
        // Set cookies for 24 hours
        document.cookie = `sf_gate_session_${trackId}=${sessionToken}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `sf_gate_uid=${uid}; path=/; max-age=86400; SameSite=Lax`;

        console.log("[SSO] Identity verified. Redirecting to Track...");
        
        // 3. Redirect to the track
        window.location.href = `./${trackId}/`;

    } catch (err) {
        console.error("[SSO] Auth failed:", err);
    }
}

// Add this to your manual "Submit" logic if you want to support manual passkey entry
window.verifyManualPasskey = async (passkey, trackId) => {
    try {
        const accessSnap = await getDoc(doc(db, 'track_access', passkey));
        if (accessSnap.exists()) {
            const accessData = accessSnap.data();
            const sessionToken = btoa(`${accessData.uid}|${Date.now()}|${trackId}`);
            document.cookie = `sf_gate_session_${trackId}=${sessionToken}; path=/; max-age=86400; SameSite=Lax`;
            return { success: true, track: accessData.track };
        }
        return { success: false, error: "Invalid Passkey" };
    } catch (err) {
        return { success: false, error: err.message };
    }
};
