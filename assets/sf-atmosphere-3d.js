/**
 * SkillForge GPU-Accelerated Atmosphere (v1.0.0)
 * Three.js Instanced Particles for High-Performance Visuals
 */

class NeuralAtmosphere3D {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'neural-atmosphere-3d';
        this.container.style.cssText = 'position:fixed; inset:0; z-index:-1; pointer-events:none; opacity:0.4;';
        document.body.prepend(this.container);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.particlesCount = 2000;
        this.initParticles();
        
        this.camera.position.z = 5;
        this.animate = this.animate.bind(this);
        
        window.addEventListener('resize', () => this.onResize());
        this.animate();
        
        console.log("[Neural3D] GPU Atmosphere Initialized");
    }

    initParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particlesCount * 3);
        const sizes = new Float32Array(this.particlesCount);

        for (let i = 0; i < this.particlesCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 15;
        }

        for (let i = 0; i < this.particlesCount; i++) {
            sizes[i] = Math.random() * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xf59e0b, // Gold
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        
        const time = Date.now() * 0.0001;
        this.points.rotation.y = time * 0.5;
        this.points.rotation.x = time * 0.2;

        // Subtle pulsing
        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        if (accentHex) {
            this.points.material.color.set(accentHex);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when Three.js is ready
window.addEventListener('load', () => {
    if (window.THREE) {
        window.neural3D = new NeuralAtmosphere3D();
    }
});

// Turbo Re-Sync
window.addEventListener('turbo:load', () => {
    if (window.neural3D) {
        window.neural3D.onResize();
    }
});

