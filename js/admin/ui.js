const ADMIN_EMAIL = 'sivamadesh.134@gmail.com';

// --- Movies / Series ---

export const renderAdminMovies = (movies, containerId, refreshCallback) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; color: #555; text-align: center;">No movies or series found in this section.</p>';
        return;
    }

    let html = '<div class="admin-list-container">';

    movies.forEach((movie, index) => {
        const typeLabel = (movie.type || 'movie') === 'series' ? 'TV Series' : 'Movie';
        const typeColor = (movie.type || 'movie') === 'series' ? 'var(--primary)' : '#aaa';
        const rating = movie.imdb || movie.rating || 'N/A';

        html += `
            <div class="admin-list-item animate-fade-up" style="animation-delay: ${index * 0.05}s;">
                <img src="${movie.sposter}" class="admin-item-img animate-blur-in">
                <div class="admin-item-content">
                    <h3 class="admin-item-title" style="color: white; font-size: 1.1rem; margin-bottom: 5px;">${movie.name}</h3>
                    <div style="display: flex; gap: 10px; opacity: 0.7; font-size: 0.85rem;">
                        <span style="color: ${typeColor}; text-transform: uppercase; font-size: 0.75rem; border: 1px solid ${typeColor}; padding: 2px 8px; border-radius: 4px;">${typeLabel}</span>
                        <span>⭐ ${rating}</span>
                    </div>
                    <div class="admin-actions">
                        <button class="admin-btn admin-btn-edit" data-id="${movie.id}">
                            <i class="bi bi-pencil-square"></i> Edit
                        </button>
                        <button class="admin-btn admin-btn-delete" data-id="${movie.id}">
                            <i class="bi bi-trash3"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Attach Listeners
    container.querySelectorAll('.admin-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const movie = movies.find(m => m.id === id);
            // Dispatch event for Core to handle
            document.dispatchEvent(new CustomEvent('admin:edit-movie', { detail: movie }));
        });
    });

    container.querySelectorAll('.admin-btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            // Dispatch event for Core to handle DB deletion
            document.dispatchEvent(new CustomEvent('admin:delete-movie', { detail: { id, callback: refreshCallback } }));
        });
    });
};

/* --- Users --- */

export const renderUsers = (users, containerId, refreshCallback) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<p style="padding: 2rem; color: #555;">No associated users found.</p>';
        return;
    }

    let html = '<div class="admin-list-container">';

    users.forEach((user, index) => {
        const photo = user.photo || 'assets/img/user.jpg';
        const joined = user.joined ? new Date(user.joined).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'an unknown date';
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
        const watchlistCount = user.watchlist ? user.watchlist.length : 0;
        const name = user.name || 'A user';

        const isBanned = user.banned === true;
        const isAdmin = user.role === 'admin' || user.email === ADMIN_EMAIL;
        const isSuperAdmin = user.email === ADMIN_EMAIL;

        html += `
            <div class="admin-list-item" style="animation-delay: ${index * 0.1}s;">
                <img src="${photo}" class="admin-user-img" style="border-color: ${isAdmin ? 'var(--primary)' : '#444'};">
                <div class="admin-item-content">
                    
                    <div class="admin-user-header">
                        <strong class="admin-user-name" style="color: ${isAdmin ? 'var(--primary)' : '#fff'};">${name}</strong>
                        ${isBanned ? '<span class="status-badge status-error">BANNED</span>' : ''}
                        ${isAdmin ? '<span class="status-badge status-success">ADMIN</span>' : ''}
                    </div>

                    <p class="admin-user-email">${user.email || 'N/A'}</p>
                    
                    <div class="admin-user-info-row">
                        <span><i class="bi bi-calendar3"></i> Joined: ${joined}</span>
                        <span><i class="bi bi-clock-history"></i> Active: ${lastLogin}</span>
                    </div>
                    
                    <div style="margin-top: 0.8rem;">
                         <span class="user-saved-badge">
                            <i class="bi bi-bookmark-heart-fill" style="color: var(--primary);"></i> ${watchlistCount} Saved Items
                        </span>
                    </div>

                    <div class="admin-actions">
                        ${!isSuperAdmin ? `
                            <button class="admin-btn admin-btn-manage-user" data-id="${user.id}">
                                <i class="bi bi-gear-fill"></i> Manage User
                            </button>
                        ` : `<span style="color: var(--text-muted); font-size: 0.8rem; padding: 10px;">Super Admin</span>`}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Actions
    container.querySelectorAll('.admin-btn-manage-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const user = users.find(u => u.id === id);
            document.dispatchEvent(new CustomEvent('admin:edit-user', { detail: user }));
        });
    });
};

/* --- Preview --- */

export const renderPreview = (data, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '';
        return;
    }

    const standardized = data.map(row => {
        const newRow = {};
        Object.keys(row).forEach(k => newRow[k.toLowerCase()] = row[k]);
        return newRow;
    });

    let html = '<div class="conversational-preview-list" style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem;">';

    standardized.slice(0, 10).forEach((row, index) => {
        const name = row.name || row.title || 'Unknown Title';
        const type = row.type || 'item';
        const genre = row.genre || 'Various';
        const year = row.year || row.date || 'N/A';

        html += `
            <div class="user-sentence-card" style="animation-delay: ${index * 0.05}s; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border-left: 4px solid var(--primary); font-size: 0.95rem; color: #ddd;">
                <p>
                    <strong style="color: #fff;">${name}</strong> is ready to be uploaded as a <strong style="color: var(--primary);">${type.toUpperCase()}</strong>. 
                    It belongs to the <strong style="color: #fff;">${genre}</strong> genre and was released in <strong style="color: #fff;">${year}</strong>.
                </p>
            </div>
        `;
    });

    html += '</div>';
    if (data.length > 10) html += `<p style="margin: 1rem; color: #555; text-align: center;">...and ${data.length - 10} more items are waiting to be processed.</p>`;

    container.innerHTML = html;
};

/* --- Series Builder --- */

export const toggleSeriesMode = (isSeries, builderEl, linkEl, downloadEl) => {
    if (isSeries) {
        if (builderEl) builderEl.classList.remove('hidden');
        if (linkEl) linkEl.closest('.form-group')?.classList.add('hidden') || linkEl.classList.add('hidden'); // Try to hide parent
        if (downloadEl) downloadEl.closest('.form-group')?.classList.add('hidden') || downloadEl.classList.add('hidden');
    } else {
        if (builderEl) builderEl.classList.add('hidden');
        if (linkEl) linkEl.closest('.form-group')?.classList.remove('hidden') || linkEl.classList.remove('hidden');
        if (downloadEl) downloadEl.closest('.form-group')?.classList.remove('hidden') || downloadEl.classList.remove('hidden');
    }
};

export const renderSeriesBuilder = (seasonsData = {}, containerId) => {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    container.innerHTML = '';
    Object.keys(seasonsData).forEach(seasonName => {
        addSeasonBlock(seasonName, seasonsData[seasonName], container);
    });
};

export const addSeasonBlock = (name, episodes = [], container) => {
    const seasonDiv = document.createElement('div');
    seasonDiv.classList.add('sb-season');

    const seasonHeader = document.createElement('div');
    seasonHeader.classList.add('sb-season-header');

    const seasonNameInput = document.createElement('input');
    seasonNameInput.value = name;
    seasonNameInput.placeholder = "Season Name (e.g. Season 1)";
    seasonNameInput.classList.add('sb-season-input');

    const removeSeasonBtn = document.createElement('button');
    removeSeasonBtn.innerHTML = '<i class="bi bi-x-lg"></i>'; // Cleaner icon
    removeSeasonBtn.className = 'btn-remove-season';
    removeSeasonBtn.type = 'button';
    removeSeasonBtn.title = 'Remove Season';
    removeSeasonBtn.onclick = () => seasonDiv.remove();

    seasonHeader.appendChild(seasonNameInput);
    seasonHeader.appendChild(removeSeasonBtn);
    seasonDiv.appendChild(seasonHeader);

    const epContainer = document.createElement('div');
    epContainer.className = 'sb-episode-container';
    seasonDiv.appendChild(epContainer);

    if (episodes.length > 0) {
        episodes.forEach(ep => addEpisodeRow(epContainer, ep));
    } else {
        addEpisodeRow(epContainer);
    }

    const addEpBtn = document.createElement('button');
    addEpBtn.type = 'button';
    addEpBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Add Episode';
    addEpBtn.className = 'btn-add-episode';
    addEpBtn.onclick = () => addEpisodeRow(epContainer);

    seasonDiv.appendChild(addEpBtn);
    container.appendChild(seasonDiv);
};

const addEpisodeRow = (container, data = {}) => {
    const row = document.createElement('div');
    row.className = 'sb-episode-row';

    const mainInfo = document.createElement('div');
    mainInfo.className = 'sb-episode-main';

    const titleInput = document.createElement('input');
    titleInput.placeholder = "Ep Title";
    titleInput.value = data.title || '';
    titleInput.className = 'sb-input sb-ep-title';

    const sizeInput = document.createElement('input');
    sizeInput.placeholder = "size";
    sizeInput.type = "number";
    sizeInput.step = "0.01";
    sizeInput.min = "0";
    sizeInput.value = data.size || '';
    sizeInput.className = 'sb-input sb-ep-size';
    sizeInput.title = 'Size (GB)';

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '<i class="bi bi-trash"></i>';
    delBtn.className = 'btn-remove-episode';
    delBtn.type = 'button';
    delBtn.onclick = () => row.remove();

    mainInfo.appendChild(titleInput);
    mainInfo.appendChild(sizeInput);
    mainInfo.appendChild(delBtn);
    row.appendChild(mainInfo);

    // Episode Sources Section
    const sourcesWrapper = document.createElement('div');
    sourcesWrapper.className = 'sb-ep-sources';

    const sourcesList = document.createElement('div');
    sourcesList.className = 'sb-ep-sources-list';
    sourcesWrapper.appendChild(sourcesList);

    const addSourceBtn = document.createElement('button');
    addSourceBtn.type = 'button';
    addSourceBtn.className = 'btn-outline-sm';
    addSourceBtn.innerHTML = '+ Add Language Source';
    
    const renderEpSource = (s = {}) => {
        const sRow = document.createElement('div');
        sRow.className = 'source-item';
        sRow.innerHTML = `
            <input type="text" class="sb-input source-lang" placeholder="Lang" value="${s.lang || 'English'}">
            <input type="text" class="sb-input source-url" placeholder="Stream URL" value="${s.url || ''}">
            <input type="text" class="sb-input source-dl" placeholder="Download URL" value="${s.download || ''}">
            <button type="button" class="btn-remove-source"><i class="bi bi-x"></i></button>
        `;
        sRow.querySelector('.btn-remove-source').onclick = () => sRow.remove();
        sourcesList.appendChild(sRow);
    };

    addSourceBtn.onclick = () => renderEpSource();
    sourcesWrapper.appendChild(addSourceBtn);
    row.appendChild(sourcesWrapper);

    // Initial Sources
    if (data.sources && Array.isArray(data.sources)) {
        data.sources.forEach(s => renderEpSource(s));
    } else if (data.url) {
        renderEpSource({ lang: 'English', url: data.url, download: data.downloadUrl });
    } else {
        renderEpSource(); // Default one
    }

    container.appendChild(row);
};

export const scrapeSeriesBuilder = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return {};

    const seasons = {};
    const seasonDivs = container.querySelectorAll('.sb-season');

    seasonDivs.forEach(div => {
        const nameInput = div.querySelector('.sb-season-input');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) return;

        const episodes = [];
        const epContainer = div.querySelector('.sb-episode-container');
        if (epContainer) {
            Array.from(epContainer.children).forEach(row => {
                const title = row.querySelector('.sb-ep-title')?.value.trim();
                const sizeVal = parseFloat(row.querySelector('.sb-ep-size')?.value);
                const size = isNaN(sizeVal) ? 0 : sizeVal;

                const sources = [];
                row.querySelectorAll('.sb-ep-sources-list .source-item').forEach(sRow => {
                    const lang = sRow.querySelector('.source-lang').value.trim();
                    const url = sRow.querySelector('.source-url').value.trim();
                    const download = sRow.querySelector('.source-dl').value.trim();
                    if (url) {
                        sources.push({ lang: lang || 'Default', url, download });
                    }
                });

                if (title && sources.length > 0) {
                    episodes.push({
                        title: title,
                        sources: sources,
                        url: sources[0].url, // Legacy top-level support
                        downloadUrl: sources[0].download, // Legacy
                        size: size,
                        duration: '??m'
                    });
                }
            });
        }
        if (episodes.length > 0) seasons[name] = episodes;
    });
    return seasons;
};