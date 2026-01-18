import { handleSearch } from '../pages/home.js';
import { activeView, filterGrid } from './navigation.js';

const searchInput = document.querySelector('.search-bar input');
const searchResults = document.getElementById('search_results');

export const initSearch = () => {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length === 0) {
            searchResults.style.display = 'none';
            filterGrid(''); // Reset grid filter
            return;
        }

        // Dropdown Search (Home specific or filtered results)
        const results = handleSearch(query, activeView);
        renderSearchResults(results);

        // Grid Search (Movies/Series Tab specific)
        filterGrid(query);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            searchResults.style.display = 'none';
        }
    });
};

const renderSearchResults = (movies) => {
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