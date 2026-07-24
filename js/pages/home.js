// Home Page Logic
import { db } from '../core/firebase-config.js';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { openVideoPlayer } from '../components/video.js';
import { auth } from '../core/firebase-config.js';
import { addToWatchlist } from '../components/watchlist.js';

export let allMovies = []; // Export for Search & Navigation

export const loadHome = async () => {
    const { renderLoader } = await import('../components/ui.js');
    // Show loader in popular row
    const row = document.getElementById('popular_movies');
    if (row) renderLoader(row);
    
    let movies = [];

    // Try Fetching from Firestore
    try {
        const querySnapshot = await getDocs(collection(db, "movies"));
        querySnapshot.forEach((doc) => {
            movies.push({ id: doc.id, ...doc.data() });
        });

        if (movies.length === 0) {
            console.log("No DB Data, checking local");
            throw new Error("Empty DB");
        }
    } catch (e) {
        console.log("Firestore Error/Empty, Loading Local Data...", e);
        try {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const dataPath = isPagesDir ? '../assets/data/movie.json' : 'assets/data/movie.json';
            const res = await fetch(dataPath);
            movies = await res.json();
        } catch (err) {
            console.error("Failed to load local movies", err);
        }
    }

    allMovies = movies; // Save for global access (Search)

    if (movies.length > 0) {
        renderHero(movies[0]);
        renderMovies(movies);
        initScrollArrows();
    }
};

const initScrollArrows = () => {
    const prevBtn = document.querySelector('.bi-chevron-left');
    const nextBtn = document.querySelector('.bi-chevron-right');
    const popularRow = document.getElementById('popular_movies');

    if (!prevBtn || !nextBtn || !popularRow) return;

    nextBtn.onclick = () => {
        popularRow.scrollBy({ left: 300, behavior: 'smooth' });
    };

    prevBtn.onclick = () => {
        popularRow.scrollBy({ left: -300, behavior: 'smooth' });
    };

    prevBtn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            popularRow.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    nextBtn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            popularRow.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };
};

const renderHero = (movie) => {
    const heroTitle = document.getElementById('hero_title');
    const heroDesc = document.getElementById('hero_desc');
    const heroSection = document.getElementById('hero_section');

    if (heroTitle) heroTitle.innerText = movie.name || movie.title || '';
    if (heroDesc) {
        heroDesc.innerHTML = `
            <span class="meta-imdb"><i class="bi bi-star-fill"></i> ${movie.imdb || movie.rating || 'N/A'}</span> 
            <span class="meta-divider">|</span> 
            <span class="meta-year">${movie.date || movie.year || 'N/A'}</span> 
            <span class="meta-divider">|</span> 
            <span class="meta-genre">${movie.genre || ''}</span>
        `;
    }
    if (heroSection && movie.bposter) {
        heroSection.style.backgroundImage = `url('${movie.bposter}')`;
    }

    // Video Player Trigger
    const watchBtn = document.querySelector('.btn-playing');
    if (watchBtn) {
        watchBtn.onclick = () => {
            const isPagesDir = window.location.pathname.includes('/pages/');
            window.location.href = isPagesDir ? `movies.html?id=${movie.id}` : `pages/movies.html?id=${movie.id}`;
        };
    }

    // My List Trigger
    const listBtn = document.querySelector('.btn-glass');
    if (listBtn) {
        listBtn.onclick = () => {
            addToWatchlist(movie);
        };
    }
};

export const createMovieCard = (movie, preventHeroUpdate = false, isWatchlist = false) => {
    const card = document.createElement('div');
    card.classList.add('movie-card', 'animate-blur-in');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${movie.name || movie.title || 'Movie'} (${movie.date || movie.year || ''})`);

    const isPagesDir = window.location.pathname.includes('/pages/');
    const fallbackImg = isPagesDir ? '../assets/img/no-poster.png' : 'assets/img/no-poster.png';

    card.innerHTML = `
        <img src="${movie.sposter || fallbackImg}" alt="${movie.name || movie.title || 'Movie Poster'}" loading="lazy" decoding="async" onerror="this.src='${fallbackImg}'">
        ${isWatchlist ? '<button class="btn-remove-watchlist" title="Remove" aria-label="Remove from watchlist">&times;</button>' : ''}
        <div class="card-content">
            <h4>${movie.name || movie.title || 'Untitled'}</h4>
            <div class="card-details">
                <span>${movie.date || movie.year || 'N/A'}</span>
                <div class="rating">
                    <i class="bi bi-star-fill"></i> ${movie.imdb || movie.rating || 'N/A'}
                </div>
            </div>
        </div>
    `;

    // Remove logic
    if (isWatchlist) {
        const removeBtn = card.querySelector('.btn-remove-watchlist');
        if (removeBtn) {
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`Remove ${movie.name || movie.title} from Watchlist?`)) {
                    const { removeFromWatchlist } = await import('../components/watchlist.js');
                    await removeFromWatchlist(movie);
                    // Refresh Watchlist view
                    const { initNavigation } = await import('../components/navigation.js');
                    const watchlistTab = document.getElementById('nav_watchlist');
                    if (watchlistTab && watchlistTab.classList.contains('active')) {
                        watchlistTab.click(); // Trigger re-render
                    }
                }
            });
        }
    }

    const handleClick = () => {
        if (preventHeroUpdate) {
            const isPagesDir = window.location.pathname.includes('/pages/');
            window.location.href = isPagesDir ? `movies.html?id=${movie.id}` : `pages/movies.html?id=${movie.id}`;
        } else {
            renderHero(movie);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    });

    return card;
};

const renderMovies = (movies) => {
    const popularRow = document.getElementById('popular_movies');
    if (!popularRow) return;
    popularRow.innerHTML = '';
    movies.forEach(movie => {
        popularRow.appendChild(createMovieCard(movie));
    });
};

// Listen for Search Selection
document.addEventListener('playMovie', (e) => {
    const movie = e.detail;
    renderHero(movie);
    window.scrollTo({ top: 0, behavior: 'smooth' });
});


// --- Features ---

// addToWatchlist is imported from watchlist.js

// Search Logic (Exported to be used by app.js or event listeners)
export const handleSearch = (query, filterType = 'home') => {
    let filtered = allMovies;

    if (filterType === 'movies') {
        filtered = allMovies.filter(m => m.type === 'movie' || !m.type);
    } else if (filterType === 'series') {
        filtered = allMovies.filter(m => m.type === 'series');
    }
    // Note: Watchlist search is handled differently if needed, 
    // but for now dropdown search can use these filters.

    const results = filtered.filter(movie =>
        movie.name.toLowerCase().includes(query.toLowerCase()) ||
        movie.genre.toLowerCase().includes(query.toLowerCase())
    );
    return results;
};
