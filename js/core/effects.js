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

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                if (scrolled < window.innerHeight) {
                    hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
                    const content = hero.querySelector('.hero-content');
                    if (content) {
                        content.style.transform = `translateY(${scrolled * 0.3}px)`;
                        content.style.opacity = Math.max(0, 1 - (scrolled / 700));
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
};

// 3. 3D Card Tilt Effect
export const initTiltEffect = () => {
    if (window.matchMedia("(max-width: 1024px)").matches) return;

    let ticking = false;
    document.addEventListener('mousemove', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const cards = document.querySelectorAll('.movie-card:hover');
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const rotateX = ((y - centerY) / centerY) * -10;
                    const rotateY = ((x - centerX) / centerX) * 10;

                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
        const target = e.target;
        if (target && target.closest && target.closest('.movie-card')) {
            const card = target.closest('.movie-card');
            if (card) card.style.transform = '';
        }
    }, { passive: true });
};
