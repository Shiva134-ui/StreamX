import { allMovies, createMovieCard } from '../pages/home.js';
import { getWatchlist } from './watchlist.js';

const contentArea = document.getElementById('content_area');
const moviesGrid = document.getElementById('movies_grid');
const gridContainer = document.getElementById('grid_container');
const gridTitle = document.getElementById('grid_title');

// Sidebar Links
const navItems = {
    home: document.getElementById('nav_home'),
    movies: document.getElementById('nav_movies'),
    series: document.getElementById('nav_series'),
    watchlist: document.getElementById('nav_watchlist')
};

export let activeView = 'home'; // Track active tab


export const initNavigation = () => {
    // Event Listeners for Sidebar
    Object.keys(navItems).forEach(view => {
        if (navItems[view]) {
            navItems[view].addEventListener('click', () => switchView(view));
        }
    });

    // Event Listeners for Bottom Nav
    // Event Listeners for Bottom Nav
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        const view = btn.getAttribute('data-view');
        if (view) {
            btn.addEventListener('click', () => switchView(view));
        }
    });
};

export const handleDeepLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam && navItems[viewParam]) {
        switchView(viewParam);
    }
};

const switchView = async (view) => {
    activeView = view; // Update global state
    // Update Active State (Sidebar)
    Object.values(navItems).forEach(el => el.classList.remove('active'));
    if (navItems[view]) navItems[view].classList.add('active');

    // Update Active State (Bottom Nav)
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-view') === view);
    });

    // Hide/Show Sections
    const heroSection = document.getElementById('hero_section');
    const categorySection = document.querySelector('.category-section');

    if (view === 'home') {
        heroSection.classList.remove('hidden');
        categorySection.classList.remove('hidden');
        moviesGrid.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        heroSection.classList.add('hidden');
        categorySection.classList.add('hidden');
        moviesGrid.classList.remove('hidden');

        await renderGrid(view);
    }

    // Close Mobile Sidebar if open
    document.getElementById('sidebar').classList.remove('active');
};

const renderGrid = async (view) => {
    gridContainer.innerHTML = '';
    let moviesToShow = [];
    let isWishlistView = false;

    if (view === 'movies') {
        gridTitle.innerText = "All Movies";
        moviesToShow = allMovies.filter(m => m.type === 'movie' || !m.type); // Default to movie if undefined
    } else if (view === 'series') {
        gridTitle.innerText = "TV Series";
        moviesToShow = allMovies.filter(m => m.type === 'series');
    } else if (view === 'watchlist') {
        gridTitle.innerText = "My Watchlist";
        isWishlistView = true;
        moviesToShow = await getWatchlist();
    }

    // Add Manage Button if Wishlist
    const manageBtnId = 'manage_wishlist_btn';
    let manageBtn = document.getElementById(manageBtnId);
    const gridActions = document.getElementById('grid_actions');

    if (isWishlistView && moviesToShow.length > 0) {
        if (!manageBtn) {
            manageBtn = document.createElement('button');
            manageBtn.id = manageBtnId;
            manageBtn.className = 'btn-manage'; // New beautiful class
            manageBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Manage';
            manageBtn.onclick = () => {
                gridContainer.classList.toggle('edit-mode');
                manageBtn.innerHTML = gridContainer.classList.contains('edit-mode') ?
                    '<i class="bi bi-check-lg"></i> Done' :
                    '<i class="bi bi-pencil-square"></i> Manage';
                
                // Toggle active state style
                if (gridContainer.classList.contains('edit-mode')) {
                    manageBtn.style.borderColor = 'var(--primary)';
                    manageBtn.style.color = 'white';
                } else {
                    manageBtn.style.borderColor = '';
                    manageBtn.style.color = '';
                }
            };
            if (gridActions) gridActions.appendChild(manageBtn);
        } else {
            manageBtn.classList.remove('hidden');
        }
    } else if (manageBtn) {
        manageBtn.classList.add('hidden');
        gridContainer.classList.remove('edit-mode');
        // Reset text
        manageBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Manage'; 
        manageBtn.style.borderColor = '';
        manageBtn.style.color = '';
    }

    if (moviesToShow.length === 0) {
        gridContainer.innerHTML = `<h3 style="grid-column: 1/-1; text-align: center; color: #555;">No items found.</h3>`;
        return;
    }

    moviesToShow.forEach((movie, index) => {
        const card = createMovieCard(movie, true, isWishlistView); // Pass isWishlist flag
        card.style.animationDelay = `${index * 0.05}s`;
        gridContainer.appendChild(card);
    });
};

// Real-time grid filtering
export const filterGrid = async (query) => {
    if (activeView === 'home') return; // Home uses dropdown search

    const gridItems = gridContainer.querySelectorAll('.movie-card');
    const q = query.toLowerCase();

    gridItems.forEach(card => {
        const title = card.querySelector('h4').innerText.toLowerCase();
        if (title.includes(q)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    // If grid is empty after filtering, show message
    const visibleItems = Array.from(gridItems).filter(item => item.style.display !== 'none');
    let noResultsMsg = document.getElementById('grid_no_results');

    if (visibleItems.length === 0 && q.length > 0) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('h3');
            noResultsMsg.id = 'grid_no_results';
            noResultsMsg.style.cssText = 'grid-column: 1/-1; text-align: center; color: #555; padding: 2rem;';
            noResultsMsg.innerText = `No results found for "${query}"`;
            gridContainer.appendChild(noResultsMsg);
        } else {
            noResultsMsg.innerText = `No results found for "${query}"`;
            noResultsMsg.style.display = 'block';
        }
    } else if (noResultsMsg) {
        noResultsMsg.style.display = 'none';
    }
};