﻿import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-storage.js';

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
const db = getFirestore(app);
const storage = getStorage(app);

class ThemeManager {
    constructor() {
        this.uid = localStorage.getItem('skillforge_mock_uid');
        const isProtectedPage = window.location.pathname.includes('trainee-dashboard');
        const isAuthPage = window.location.pathname.includes('login') || window.location.pathname.includes('registration');
        
        if (!this.uid && isProtectedPage && !isAuthPage) {
            const base = window.location.pathname.split('/trainee-dashboard')[0] || '';
            window.location.href = `${base}/trainee-login/`;
        }
        this.currentTheme = JSON.parse(localStorage.getItem('sf_global_theme') || '{}');
        this.controls = {
            glow: localStorage.getItem('sf_glow_mode') === 'true',
            light: localStorage.getItem('sf_light_mode') === 'true',
            performance: localStorage.getItem('sf_performance_mode') === 'true'
        };
        this.fonts = [
            { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
            { name: 'Instrument Serif', family: "'Instrument Serif', serif" },
            { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
            { name: 'Unbounded', family: "'Unbounded', sans-serif" },
            { name: 'Caveat', family: "'Caveat', cursive" },
            { name: 'Inter', family: "'Inter', sans-serif" },
            { name: 'Playfair Display', family: "'Playfair Display', serif" },
            { name: 'Outfit', family: "'Outfit', sans-serif" },
            { name: 'Syne', family: "'Syne', sans-serif" },
            { name: 'Clash Display', family: "'Clash Display', sans-serif" },
            { name: 'Lexend', family: "'Lexend', sans-serif" },
            { name: 'Cabinet Grotesk', family: "'Cabinet Grotesk', sans-serif" },
            { name: 'Satoshi', family: "'Satoshi', sans-serif" },
            { name: 'General Sans', family: "'General Sans', sans-serif" },
            { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" }
        ];
        this.init();
        
        // Zero-Refresh Engine (PJAX) Integration
        window.addEventListener('turbo:load', (e) => {
            console.log(`[ThemeManager] Neural Re-Sync: ${e.detail.url}`);
            this.applyTheme(this.currentTheme);
            this.applyFont(localStorage.getItem('sf_font_family'));
            this.applyControls(this.controls);
            this.applyWallpaper(localStorage.getItem('sf_wallpaper_url'));
        });
    }

    async init() {
        this.applyTheme(this.currentTheme);
        this.applyControls(this.controls);

        if (!this.uid) {
            console.warn('ThemeManager: No UID found, skipping realtime sync.');
            return;
        }

        const auth = getAuth(app);
        
        // Use onAuthStateChanged to ensure we only sync when authenticated
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('ThemeManager: Connection confirmed, loading preferences...');
                this.startSync();
            } else {
                console.log('ThemeManager: Initializing session...');
                signInAnonymously(auth).catch(err => {
                    console.error('ThemeManager: Session initialization failed:', err);
                });
            }
        });
    }

    startSync() {
        onSnapshot(doc(db, 'trainees', this.uid), (doc) => {
            console.log('ThemeManager: Received registry snapshot update');
            if (doc.exists()) {
                const data = doc.data();
                if (data.theme) {
                    console.log('ThemeManager: Applying remote theme:', data.theme.type);
                    this.currentTheme = data.theme;
                    localStorage.setItem('sf_global_theme', JSON.stringify(data.theme));
                    this.applyTheme(data.theme);
                }
                if (data.fontFamily) {
                    console.log('ThemeManager: Applying remote font:', data.fontFamily);
                    this.applyFont(data.fontFamily);
                }
                if (data.controls || data.isLightMode !== undefined) {
                    this.controls = {
                        glow: !!data.controls?.glow,
                        light: !!data.isLightMode,
                        performance: !!data.performanceMode
                    };
                    localStorage.setItem('sf_glow_mode', this.controls.glow);
                    localStorage.setItem('sf_light_mode', this.controls.light);
                    localStorage.setItem('sf_performance_mode', this.controls.performance);
                    this.applyControls(this.controls);
                }
                if (data.wallpaper) {
                    console.log('ThemeManager: Applying remote wallpaper');
                    this.applyWallpaper(data.wallpaper);
                }
            }
        }, (err) => {
            console.error('ThemeManager Snapshot failed:', err);
            if (window.sf_report_error) {
                window.sf_report_error(`Registry Sync Failed: ${err.message}`, err.stack);
            }
        });
    }

    applyFont(fontFamily) {
        if (!fontFamily) return;
        document.documentElement.style.setProperty('--font-main', fontFamily);
        localStorage.setItem('sf_font_family', fontFamily);
    }

    applyTheme(theme) {
        if (!theme || Object.keys(theme).length === 0) {
            console.warn("[ThemeManager] Attempted to apply empty theme. Falling back to defaults.");
            theme = { type: 'solid-pair', primary: '#040810', secondary: '#f59e0b' };
        }
        
        console.log(`[ThemeManager] Applying atmosphere matrix: ${theme.type}`);
        const root = document.documentElement;
        const body = document.body;
        
        // Save current theme to memory
        this.currentTheme = theme;
        localStorage.setItem('sf_global_theme', JSON.stringify(theme));

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '245, 158, 11';
        };
        const hexToLum = (hex) => {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!m) return 0.2;
            const srgb = [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255].map(v => v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
            return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
        };
        const autoContrast = (bgHex) => {
            if (this.controls.light) return;
            const lum = hexToLum(bgHex);
            if (lum > 0.6) {
                body.classList.add('light');
                document.documentElement.style.setProperty('--text-main', '#040810');
                document.documentElement.style.setProperty('--text-muted', 'rgba(4, 8, 16, 0.6)');
            } else {
                body.classList.remove('light');
                document.documentElement.style.setProperty('--text-main', '#f1f5f9');
                document.documentElement.style.setProperty('--text-muted', 'rgba(241, 245, 249, 0.6)');
            }
        };
        
        if (theme.type === 'gradient') {
            const grad = `linear-gradient(135deg, ${theme.c1}, ${theme.c2})`;
            root.style.setProperty('--accent-gradient', grad);
            root.style.setProperty('--accent-color', theme.c1);
            root.style.setProperty('--accent-color-secondary', theme.c2);
            root.style.setProperty('--accent-color-rgb', hexToRgb(theme.c1));
            root.style.setProperty('--global-bg', grad);
            document.body.style.background = grad;
            document.body.style.backgroundAttachment = 'fixed';
            autoContrast(theme.c1);
            // Global background particles sync
            window.dispatchEvent(new CustomEvent('sf:bg_update', { detail: { colors: [theme.c1, theme.c2] } }));
        } else if (theme.type === 'premium-gradient') {
            const grad = `linear-gradient(135deg, ${theme.colors.join(', ')})`;
            root.style.setProperty('--accent-gradient', grad);
            root.style.setProperty('--accent-color', theme.colors[0]);
            root.style.setProperty('--accent-color-secondary', theme.colors[1]);
            root.style.setProperty('--accent-color-rgb', hexToRgb(theme.colors[0]));
            root.style.setProperty('--global-bg', grad);
            document.body.style.background = grad;
            document.body.style.backgroundAttachment = 'fixed';
            autoContrast(theme.colors[0]);
            window.dispatchEvent(new CustomEvent('sf:bg_update', { detail: { colors: theme.colors } }));
        } else if (theme.type === 'solid-pair' || theme.type === 'dual') {
            const primary = theme.primary || theme.color;
            const secondary = theme.secondary || primary;
            root.style.setProperty('--accent-color', primary);
            root.style.setProperty('--accent-color-secondary', secondary);
            root.style.setProperty('--accent-color-rgb', hexToRgb(primary));
            root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${primary}, ${secondary})`);
            root.style.setProperty('--global-bg', '#040810');
            document.body.style.background = '#040810';
            autoContrast(secondary);
            window.dispatchEvent(new CustomEvent('sf:bg_update', { detail: { colors: [primary, secondary] } }));
        } else if (theme.type === 'accent') {
            root.style.setProperty('--accent-color', theme.color);
            root.style.setProperty('--accent-color-rgb', hexToRgb(theme.color));
            root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${theme.color}, ${theme.color})`);
            root.style.setProperty('--global-bg', '#040810');
            document.body.style.background = '#040810';
            autoContrast(theme.color);
        }

        if (theme.layout && (window.location.pathname.endsWith('trainee-dashboard/') || window.location.pathname.endsWith('trainee-dashboard/index.html'))) {
            if (typeof window.showLayout === 'function') {
                window.showLayout(theme.layout);
            }
        }
    }

    applyControls(controls) {
        const body = document.body;
        controls.glow ? body.classList.add('glow-mode') : body.classList.remove('glow-mode');
        controls.light ? body.classList.add('light') : body.classList.remove('light');
        controls.performance ? body.classList.add('perf-mode') : body.classList.remove('perf-mode');
    }

    applyWallpaper(url) {
        if (!url) {
            document.body.style.backgroundImage = '';
            return;
        }
        localStorage.setItem('sf_wallpaper_url', url);
        document.body.style.backgroundImage = `url('${url}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        if (!this.controls.light) document.body.classList.remove('light');
    }

    async saveLayout(layoutNum, source = 'LAYOUT_ENGINE') {
        try {
            const themeUpdate = { ...this.currentTheme, layout: layoutNum };
            await setDoc(doc(db, 'trainees', this.uid), { theme: themeUpdate }, { merge: true });
            await this.logChange('LAYOUT_UPDATE', { source, old: this.currentTheme.layout, new: layoutNum });
            this.currentTheme = themeUpdate;
            localStorage.setItem('sf_global_theme', JSON.stringify(themeUpdate));
            this.applyTheme(themeUpdate);
            return true;
        } catch (err) {
            console.error('Layout Save Failed:', err);
            return false;
        }
    }

    async saveTheme(theme, source = 'UNKNOWN') {
        try {
            await setDoc(doc(db, 'trainees', this.uid), { theme }, { merge: true });
            await this.logChange('THEME_UPDATE', { source, old: this.currentTheme, new: theme, type: theme.type });
            this.currentTheme = theme;
            localStorage.setItem('sf_global_theme', JSON.stringify(theme));
            this.applyTheme(theme);
            return true;
        } catch (err) {
            console.error('Theme Save Failed:', err);
            return false;
        }
    }

    async saveCardTheme(cardTheme, source = 'DMC_DESIGNER') {
        try {
            await setDoc(doc(db, 'trainees', this.uid), { cardTheme }, { merge: true });
            await this.logChange('CARD_THEME_UPDATE', { source, cardTheme });
            return true;
        } catch (err) {
            console.error('Card Theme Save Failed:', err);
            return false;
        }
    }

    async saveControls(controls, source = 'SETTINGS') {
        try {
            const update = { 'controls.glow': controls.glow, isLightMode: controls.light, performanceMode: controls.performance };
            await setDoc(doc(db, 'trainees', this.uid), update, { merge: true });
            await this.logChange('CONTROLS_UPDATE', { source, controls });
            this.controls = controls;
            this.applyControls(controls);
            return true;
        } catch (err) {
            console.error('Controls Save Failed:', err);
            return false;
        }
    }

    async saveFont(fontFamily, source = 'CUSTOMIZE') {
        try {
            await setDoc(doc(db, 'trainees', this.uid), { fontFamily }, { merge: true });
            await this.logChange('FONT_UPDATE', { source, fontFamily });
            this.applyFont(fontFamily);
            return true;
        } catch (err) {
            console.error('Font Save Failed:', err);
            return false;
        }
    }

    async saveWallpaper(fileOrUrl, source = 'CUSTOMIZE', isPublic = false) {
        try {
            let url = fileOrUrl;
            if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
                const fileRef = ref(storage, `wallpapers/${this.uid}/${Date.now()}_${fileOrUrl.name || 'wallpaper'}`);
                await uploadBytes(fileRef, fileOrUrl);
                url = await getDownloadURL(fileRef);
            }
            const update = { wallpaper: url };
            if (isPublic) update.isPublicWallpaper = true;
            await setDoc(doc(db, 'trainees', this.uid), update, { merge: true });
            await this.logChange('WALLPAPER_UPDATE', { source, url, isPublic });
            this.applyWallpaper(url);
            return url;
        } catch (err) {
            console.error('Wallpaper Save Failed:', err);
            return false;
        }
    }

    async saveProfileData(profileData, source = 'REGISTRATION') {
        try {
            const dataToSave = { ...profileData };
            // If avatar is a File, upload it first
            if (profileData.avatar instanceof File || profileData.avatar instanceof Blob) {
                const fileRef = ref(storage, `avatars/${this.uid}_${Date.now()}`);
                await uploadBytes(fileRef, profileData.avatar);
                dataToSave.avatar = await getDownloadURL(fileRef);
            }
            await setDoc(doc(db, 'trainees', this.uid), dataToSave, { merge: true });
            await this.logChange('PROFILE_UPDATE', { source, profileData: dataToSave });
            return true;
        } catch (err) {
            console.error('Profile Update Failed:', err);
            return false;
        }
    }

    async logChange(action, modifications) {
        try {
            await addDoc(collection(db, 'audit_logs'), {
                userId: this.uid,
                action,
                modifications,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                page: window.location.pathname
            });
        } catch (err) {
            console.warn('Logging failed:', err);
        }
    }
}

export const themeManager = new ThemeManager();
window.themeManager = themeManager;

