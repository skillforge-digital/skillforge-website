import { db, auth } from '../../assets/firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';

const SESSION_COOKIE_PREFIX = 'sf_gate_session_';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getTrackIdFromPath() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const academyIndex = pathParts.indexOf('academy');
  if (academyIndex !== -1 && pathParts.length > academyIndex + 1) {
    return pathParts[academyIndex + 1];
  }
  return null;
}

function parseSession(sessionValue) {
  try {
    const decoded = atob(sessionValue);
    const [uid, timestamp, trackId] = decoded.split('|');
    return { uid, timestamp: parseInt(timestamp), trackId };
  } catch {
    return null;
  }
}

async function verifySession(trackId) {
  const sessionCookie = getCookie(`${SESSION_COOKIE_PREFIX}${trackId}`);
  if (!sessionCookie) return false;

  const session = parseSession(sessionCookie);
  if (!session) return false;

  if (Date.now() - session.timestamp > SESSION_DURATION_MS) {
    return false;
  }

  try {
    if (!auth.currentUser) return false;
    const traineeRef = doc(db, 'trainees', auth.currentUser.uid);
    const traineeSnap = await getDoc(traineeRef);
    
    if (!traineeSnap.exists()) return false;
    const traineeData = traineeSnap.data();
    
    if (traineeData.locked_track && traineeData.locked_track !== trackId) {
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[Gate] Session verification error:', err);
    return false;
  }
}

export async function initAccessGate() {
  const trackId = getTrackIdFromPath();
  if (!trackId) {
    console.log('[Gate] No track ID found in path');
    return;
  }

  const hasSession = await verifySession(trackId);
  if (hasSession) {
    console.log(`[Gate] Valid session for track: ${trackId}`);
    return true;
  }

  console.log(`[Gate] No valid session for track: ${trackId}, redirecting to gate`);
  window.location.href = `./gate.html?track=${trackId}`;
  return false;
}

export function isAccessGated(trackId) {
  const sessionCookie = getCookie(`${SESSION_COOKIE_PREFIX}${trackId}`);
  if (!sessionCookie) return false;

  const session = parseSession(sessionCookie);
  if (!session) return false;

  return Date.now() - session.timestamp <= SESSION_DURATION_MS;
}

export function clearGateSession(trackId) {
  document.cookie = `${SESSION_COOKIE_PREFIX}${trackId}=; path=/; max-age=0; SameSite=Lax`;
}

export function getGateUid() {
  return getCookie('sf_gate_uid');
}