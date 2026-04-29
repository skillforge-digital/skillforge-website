import { db, auth } from '../assets/firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';


const SESSION_COOKIE_PREFIX = 'sf_gate_session_';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;


function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  let matchedValue = null;
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (!cookie) continue;
    if (cookie.startsWith(`${name}=`)) {
      matchedValue = cookie.substring(name.length + 1);
    }
  }
  return matchedValue;
}


function getTrackIdFromPath() {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const academyIndex = pathParts.indexOf('academy');
  if (academyIndex !== -1 && pathParts.length > academyIndex + 1) {
    const trackId = pathParts[academyIndex + 1];
    if (trackId && trackId !== 'index.html' && trackId !== 'gate.html') {
      return trackId;
    }
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
