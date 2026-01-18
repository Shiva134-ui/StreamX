/**
 * Advanced Visual Effects Module
 * Handles scroll animations, parallax, and 3D tilts.
 */

// 1. Scroll Reveal System
export const initScrollReveal = () => {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once revealed for better performance
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Target generic elements
    const elements = document.querySelectorAll('.reveal-on-scroll, .movie-card, .section-header, .hero-content');
    elements.forEach(el => observer.observe(el));
};

// 2. Hero Parallax Effect
export const initParallax = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        // Limit parallax to viewport height
        if (scrolled < window.innerHeight) {
            hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
            const content = hero.querySelector('.hero-content');
            if (content) {
                content.style.transform = `translateY(${scrolled * 0.3}px)`;
                content.style.opacity = 1 - (scrolled / 700);
            }
        }
    });
};

// 3. 3D Card Tilt Effect
export const initTiltEffect = () => {
    // Only apply on desktop for performance
    if (window.matchMedia("(max-width: 1024px)").matches) return;

    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.movie-card:hover'); // Only calculate for hovered card
        
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
            const rotateY = ((x - centerX) / centerX) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
    });

    // Reset when mouse leaves
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.movie-card')) {
            const card = e.target.closest('.movie-card');
            card.style.transform = '';
        }
    });
};
