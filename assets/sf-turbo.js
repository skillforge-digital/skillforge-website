/**
 * SkillForge Turbo Engine (v1.1.0)
 * Zero-Refresh MPA Transitions (PJAX)
 */

class SkillForgeTurbo {
    constructor() {
        this.cache = new Map();
        this.isNavigating = false;
        this.init();
    }

    init() {
        // Listen for all clicks on the document
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            // Only intercept internal links
            const url = new URL(link.href);
            if (url.origin !== window.location.origin) return;
            
            // Skip actual file downloads, hash links, or external targets
            if (link.hasAttribute('download') || url.hash || link.target === '_blank') return;
            
            // Normalize paths for comparison (remove trailing slashes and index.html)
            const normalize = (path) => path.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
            const currentPath = normalize(window.location.pathname);
            const targetPath = normalize(url.pathname);
            
            if (currentPath === targetPath) {
                // Same page - just prevent default to avoid refresh
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            e.preventDefault();
            
            // Standardize URL to absolute path from root
            const absoluteTarget = url.origin === window.location.origin ? url.pathname + url.search + url.hash : url.href;
            this.navigate(absoluteTarget);
        });

        // Hidden "Slash Command" for Specialist Portal
        let buffer = '';
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            buffer += e.key.toLowerCase();
            if (buffer.endsWith('/staff')) {
                console.log("[Turbo] Specialist Authorization Command Detected");
                buffer = '';
                window.location.href = '/activate-specialist.html';
            }
            if (buffer.length > 10) buffer = buffer.substring(1);
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.url) {
                this.navigate(e.state.url, false);
            }
        });

        // Store initial state
        window.history.replaceState({ url: window.location.href }, '', window.location.href);
        this.registerServiceWorker();
        console.log("[Turbo] Engine Initialized");
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[OfflineMatrix] Sync Active:', reg.scope))
                    .catch(err => console.error('[OfflineMatrix] Registry Sync Failed:', err));
            });
        }
    }

    async navigate(url, pushState = true) {
        if (this.isNavigating) return;
        this.isNavigating = true;

        console.log(`[Turbo] Navigating to: ${url}`);
        this.showProgressBar();

        try {
            if (this.currentController) {
                this.currentController.abort();
            }
            this.currentController = new AbortController();

            const res = await fetch(url, {
                signal: this.currentController.signal,
                headers: { 'X-Requested-With': 'SkillForge-Turbo' }
            });
            const html = await res.text();
            
            // Dispatch 'before-render' for hydration preparation
            window.dispatchEvent(new CustomEvent('sf:turbo-before-render'));

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Efficiently swap content
            const oldMain = document.querySelector('main');
            const newMain = doc.querySelector('main');
            if (oldMain && newMain) {
                oldMain.innerHTML = newMain.innerHTML;
                
                // Update specific page classes or metadata
                document.title = doc.title;
                
                // Re-initialize scripts for the new content
                this.rehydrate();
            } else {
                // Fallback for non-dashboard pages
                window.location.href = url;
            }

            window.history.pushState({}, '', url);
            window.dispatchEvent(new CustomEvent('sf:turbo-render'));
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("[Turbo] Engine stall:", err);
                window.location.href = url;
            }
        }
    }

    rehydrate() {
        console.log("[Turbo] Hydrating neural nodes...");
        
        // 1. Re-initialize Lucide icons
        if (window.lucide) window.lucide.createIcons();
        
        // 2. Re-trigger theme application
        if (window.themeManager) window.themeManager.init();
        
        // 3. Re-initialize page-specific logic
        // Any <script> inside <main> will be executed if manually handled
        const scripts = document.querySelector('main').querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
    }

    showProgressBar() {
        let bar = document.getElementById('turbo-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'turbo-progress';
            bar.style.cssText = `
                position: fixed; top: 0; left: 0; height: 2px; 
                background: #f59e0b; z-index: 9999; transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
            `;
            document.body.appendChild(bar);
        }
        bar.style.width = '0%';
        setTimeout(() => bar.style.width = '70%', 10);
    }

    hideProgressBar() {
        const bar = document.getElementById('turbo-progress');
        if (bar) {
            bar.style.width = '100%';
            setTimeout(() => {
                bar.style.width = '0%';
            }, 300);
        }
    }
}

export const turbo = new SkillForgeTurbo();
window.sfTurbo = turbo;

