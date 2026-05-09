/* Frontend/js/confetti.js */

/**
 * Very basic confetti implementation without heavy libraries.
 * Fits into the "Micro-interaction" requirement perfectly.
 */
window.showSuccessConfetti = () => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '10000';
    document.body.appendChild(container);

    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        particle.style.position = 'absolute';
        particle.style.width = '10px';
        particle.style.height = '10px';
        particle.style.backgroundColor = color;
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.opacity = '1';
        particle.style.borderRadius = '2px';
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 10;
        const tx = Math.cos(angle) * velocity * 20;
        const ty = Math.sin(angle) * velocity * 20 - 50;

        container.appendChild(particle);

        const anim = particle.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0, .9, .57, 1)'
        });

        anim.onfinish = () => particle.remove();
    }

    setTimeout(() => container.remove(), 2000);
};
