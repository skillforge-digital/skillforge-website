/**
 * SkillForge Cryptographic Pass-code Engine
 * Generates and validates unique, season-specific access codes.
 */

export class PassCodeEngine {
    static CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars (I, O, 0, 1)
    
    /**
     * Generate an 8-character pass-code
     * @param {string} trackId - E.g., 'web-dev'
     * @param {string} seasonId - E.g., 'S26'
     * @returns {string} - The generated code
     */
    static generate(trackId, seasonId) {
        // 1. Human-readable signature (first char of track + first char of season)
        const sig = (trackId.charAt(0) + seasonId.charAt(0)).toUpperCase();
        
        // 2. Random entropy (4 characters)
        let entropy = '';
        for (let i = 0; i < 4; i++) {
            entropy += this.CHARS.charAt(Math.floor(Math.random() * this.CHARS.length));
        }
        
        const base = sig + entropy; // 6 chars
        
        // 3. Checksum (2 characters)
        const checksum = this.calculateChecksum(base);
        
        return base + checksum;
    }
    
    static calculateChecksum(base) {
        let sum = 0;
        for (let i = 0; i < base.length; i++) {
            sum += base.charCodeAt(i) * (i + 1);
        }
        const c1 = this.CHARS.charAt(sum % this.CHARS.length);
        const c2 = this.CHARS.charAt((sum * 7) % this.CHARS.length);
        return c1 + c2;
    }
    
    static verify(code) {
        if (!code || code.length !== 8) return false;
        const base = code.substring(0, 6);
        const providedChecksum = code.substring(6);
        return this.calculateChecksum(base) === providedChecksum;
    }

    /**
     * Hashes the code for secure storage
     */
    static async hash(code) {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
