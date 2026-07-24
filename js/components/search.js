import { handleSearch } from '../pages/home.js';
import { activeView, filterGrid } from './navigation.js';

let searchDebounceTimer = null;

export const initSearch = () => {
    const searchInput = document.querySelector('.search-bar input');
    const searchResults = document.getElementById('search_results');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

        if (query.length === 0) {
            searchResults.style.display = 'none';
            filterGrid(''); // Reset grid filter
            return;
        }

        searchDebounceTimer = setTimeout(() => {
            // Dropdown Search (Home specific or filtered results)
            const results = handleSearch(query, activeView);
            renderSearchResults(results);

            // Grid Search (Movies/Series Tab specific)
            filterGrid(query);
        }, 250);
    });

    // Close on click outside
    if (!isSearchClickListenerAttached) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar')) {
                const res = document.getElementById('search_results');
                if (res) res.style.display = 'none';
            }
        });
        isSearchClickListenerAttached = true;
    }
};

let isSearchClickListenerAttached = false;

const renderSearchResults = (movies) => {
    const searchResults = document.getElementById('search_results');
    if (!searchResults) return;
    searchResults.innerHTML = '';

    if (movies.length === 0) {
        searchResults.style.display = 'block';
        searchResults.innerHTML = '<div class="no-result">No results found</div>';
        return;
    }

    movies.forEach(movie => {
        const div = document.createElement('div');
        div.classList.add('search-item');
        div.innerHTML = `
            <img src="${movie.sposter}" alt="${movie.name}">
            <div class="search-item-info">
                <h4>${movie.name}</h4>
                <span>${movie.date} • ${movie.genre}</span>
            </div>
        `;

        div.addEventListener('click', () => {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const targetPath = isPagesDir ? `movies.html?id=${movie.id}` : `pages/movies.html?id=${movie.id}`;
            window.location.href = targetPath;
        });

        searchResults.appendChild(div);
    });

    searchResults.style.display = 'block';
};