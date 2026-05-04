const SESSION_COOKIE_PREFIX = 'sf_gate_session_';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (!cookie) continue;
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function getTrackIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const academyIndex = parts.indexOf('academy');
  if (academyIndex === -1 || parts.length <= academyIndex + 1) return null;

  const trackId = parts[academyIndex + 1];
  if (!trackId || trackId === 'index.html' || trackId === 'gate.html') return null;
  return trackId;
}

function parseSession(sessionValue) {
  try {
    const decoded = atob(sessionValue);
    const [uid, timestamp, trackId] = decoded.split('|');
    const ts = Number.parseInt(timestamp, 10);
    if (!uid || !Number.isFinite(ts) || !trackId) return null;
    return { uid, timestamp: ts, trackId };
  } catch {
    return null;
  }
}

function isFresh(timestamp) {
  return Number.isFinite(timestamp) && Date.now() - timestamp < SESSION_DURATION_MS;
}

function redirectToGate(trackId) {
  const target = `/academy/gate.html?track=${encodeURIComponent(trackId)}`;
  if (window.location.pathname === target) return;
  window.location.href = target;
}

function setTrackSession(trackId, uid) {
  const token = btoa(`${uid}|${Date.now()}|${trackId}`);
  setCookie(`${SESSION_COOKIE_PREFIX}${trackId}`, token, Math.floor(SESSION_DURATION_MS / 1000));
  setCookie('sf_gate_uid', uid, Math.floor(SESSION_DURATION_MS / 1000));
}

function getUniversalStaffUid() {
  const raw = getCookie('sf_gate_staff_session');
  if (!raw) return null;
  try {
    const decoded = atob(raw);
    const [uid, tsRaw] = decoded.split('|');
    const ts = Number.parseInt(tsRaw, 10);
    if (!uid || !isFresh(ts)) return null;
    return uid;
  } catch {
    return null;
  }
}

function verifySession(trackId) {
  const raw = getCookie(`${SESSION_COOKIE_PREFIX}${trackId}`);
  if (!raw) return { ok: false };
  const parsed = parseSession(raw);
  if (!parsed) return { ok: false };
  if (parsed.trackId !== trackId) return { ok: false };
  if (!isFresh(parsed.timestamp)) return { ok: false };
  return { ok: true, uid: parsed.uid };
}

function boot() {
  const trackId = getTrackIdFromPath();
  if (!trackId) return;

  const session = verifySession(trackId);
  if (session.ok) return;

  const staffUid = getUniversalStaffUid();
  if (staffUid) {
    setTrackSession(trackId, staffUid);
    return;
  }

  redirectToGate(trackId);
}

boot();
