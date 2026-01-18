import { db, auth } from '../core/firebase-config.js';
import { doc, getDoc, collection, getDocs, query, where, limit, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onUserChange, logoutUser } from '../core/auth.js';
import { updateUserUI, renderLoginModal } from '../components/ui.js';
import { initSearch } from '../components/search.js';
import { addToWatchlist } from '../components/watchlist.js';
import { convertToEmbedUrl, getDriveDownloadLink } from '../components/video.js';

// DOM Elements
const videoContainer = document.querySelector('.video-container'); // Wrapper
const title = document.getElementById('title');
const date = document.getElementById('date');
const rating = document.getElementById('rating');
const gen = document.getElementById('gen');
const desc = document.getElementById('paragraph');
const downloadBtn = document.getElementById('download_btn');
const addListBtn = document.getElementById('add_list_btn');

// Series Elements
const seriesSection = document.getElementById('series_section');
const seasonSelect = document.getElementById('season_select');
const episodeList = document.getElementById('episode_list');

// Similar
const similarGrid = document.getElementById('similar_grid');

// Get Movie ID
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');

let currentMovie = null;
let currentLanguage = 'English'; // Default tracking

document.addEventListener('DOMContentLoaded', () => {
    initSearch(); // Search Bar Logic

    // Auth Listener
    onUserChange((user) => {
        updateUserUI(user);
    });

    // Global Clicks (Logout, Login)
    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'logout_btn') logoutUser();
        if (e.target.id === 'login_btn') renderLoginModal();
    });

    if (movieId) {
        loadMovie(movieId);
    } else {
        window.location.href = 'index.html';
    }
});

// Global Player Instance
let player = null;

// --- Smart Player: Progress Tracking ---
const saveProgress = async (id, currentTime, duration) => {
    if (!auth.currentUser || !id) return;
    try {
        const progressRef = doc(db, "users", auth.currentUser.uid, "continue_watching", id);
        await setDoc(progressRef, {
            movieId: id,
            currentTime: currentTime,
            duration: duration,
            lastWatched: serverTimestamp(),
            name: currentMovie.name || '',
            poster: currentMovie.sposter || '',
            type: currentMovie.type || 'movie'
        }, { merge: true });
    } catch (e) {
        console.error("Error saving progress:", e);
    }
};

const getProgress = async (id) => {
    if (!auth.currentUser || !id) return 0;
    try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid, "continue_watching", id));
        if (snap.exists()) {
            const data = snap.data();
            // Only resume if > 5% and < 90%
            const percentage = (data.currentTime / data.duration) * 100;
            if (percentage > 5 && percentage < 95) {
                return data.currentTime;
            }
        }
    } catch (e) { console.error(e); }
    return 0;
};

// --- Smart Player: Auto Next Episode ---
const injectNextEpisodeOverlay = (nextEp) => {
    // Remove existing
    const existing = videoContainer.querySelector('.video-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    overlay.innerHTML = `
        <button class="next-ep-btn" id="auto_next_btn">
            <div class="countdown-ring"></div>
            Next Episode
        </button>
    `;

    overlay.querySelector('#auto_next_btn').onclick = () => {
        playEpisode(nextEp);
    };

    videoContainer.appendChild(overlay);
    return overlay;
};

// --- Multi-Language Support ---

/** Shared UI Class for Selectors (Episodes/Audio) */
class PlayerDrawer {
    constructor(id, title, items, onSelect, activeMatch) {
        this.id = id;
        this.title = title;
        this.items = items;
        this.onSelect = onSelect;
        this.activeMatch = activeMatch;
        this.el = null;
    }

    render() {
        let drawer = videoContainer.querySelector(`.${this.id}`);
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.className = `player-episode-drawer ${this.id}`;
            videoContainer.appendChild(drawer);
        }
        this.el = drawer;

        this.el.innerHTML = `
            <div class="drawer-header">
                <h3>${this.title}</h3>
                <button class="close-drawer"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="drawer-ep-list"></div>
        `;

        const list = this.el.querySelector('.drawer-ep-list');
        this.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'drawer-ep-item';
            if (this.activeMatch(item)) row.classList.add('active');

            row.innerHTML = `
                <div class="drawer-ep-number">${item.icon || '<i class="bi bi-play-fill"></i>'}</div>
                <div class="drawer-ep-info">
                    <h4>${item.label}</h4>
                    <span>${item.sub || ''}</span>
                </div>
            `;
            row.onclick = () => {
                this.onSelect(item.raw);
                this.el.classList.remove('open');
            };
            list.appendChild(row);
        });

        this.el.querySelector('.close-drawer').onclick = () => this.el.classList.remove('open');
        return this.el;
    }

    toggle() {
        if (!this.el) this.render();
        this.el.classList.toggle('open');
    }
}

const setupAudioControls = (sources) => {
    // If Plyr player exists, inject into its controls
    if (player) {
        if (document.getElementById('plyr_audio_btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'plyr_audio_btn';
        btn.className = 'plyr__controls__item plyr__control plyr__control--custom';
        btn.innerHTML = `<i class="bi bi-translate"></i> Audio`;
        
        const controls = videoContainer.querySelector('.plyr__controls');
        if (controls) {
            const settingsBtn = controls.querySelector('[data-plyr="settings"]');
            if (settingsBtn) {
                 settingsBtn.parentNode.insertBefore(btn, settingsBtn);
            } else {
                 controls.appendChild(btn);
            }
        }

        btn.onclick = () => {
            const drawer = new PlayerDrawer(
                'player-audio-drawer',
                'Audio / Language',
                sources.map(s => ({ label: s.lang, icon: '<i class="bi bi-volume-up"></i>', raw: s })),
                (s) => {
                    currentLanguage = s.lang;
                    changeVideoByLang(s);
                },
                (item) => item.lang === currentLanguage
            );
            drawer.toggle();
        };
    } else {
        // FALLBACK FOR EMBEDS (YouTube/Drive)
        // Add Controls Toolbar
        if (document.getElementById('embed_toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.id = 'embed_toolbar';
        toolbar.className = 'embed-toolbar animate-fade-in';
        
        // 1. Language / Source
        if (sources.length > 0) {
            const langBtn = document.createElement('button');
            langBtn.className = 'embed-tool-btn';
            langBtn.innerHTML = `<i class="bi bi-translate"></i> <span>${currentLanguage}</span>`;
            langBtn.title = "Change Audio/Source";
            langBtn.onclick = () => {
                const drawer = videoContainer.querySelector('.player-audio-drawer') || injectAudioDrawer(sources, currentLanguage, (s) => {
                     currentLanguage = s.lang;
                     langBtn.querySelector('span').innerText = s.lang;
                     changeVideoByLang(s);
                });
                drawer.classList.toggle('open');
            };
            toolbar.appendChild(langBtn);
        }

        // 2. Reload Frame
        const reloadBtn = document.createElement('button');
        reloadBtn.className = 'embed-tool-btn';
        reloadBtn.innerHTML = `<i class="bi bi-arrow-clockwise"></i>`;
        reloadBtn.title = "Reload Video";
        reloadBtn.onclick = () => {
            const iframe = videoContainer.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        };
        toolbar.appendChild(reloadBtn);

        // 3. Theater Mode
        const theaterBtn = document.createElement('button');
        theaterBtn.className = 'embed-tool-btn';
        theaterBtn.innerHTML = `<i class="bi bi-aspect-ratio"></i>`;
        theaterBtn.title = "Theater Mode";
        theaterBtn.onclick = () => {
            document.querySelector('.player-layout').classList.toggle('theater-mode');
            theaterBtn.classList.toggle('active');
        };
        toolbar.appendChild(theaterBtn);
        
        videoContainer.appendChild(toolbar);
    }
};

// Global for internal reloading
let changeVideoByLang = null;

// Modified setVideoSource to accept array of Sources
const setVideoSource = async (sourcesData, poster = '', idForProgress = null, nextEp = null) => {
    // Normalize sources: Ensure it's an array
    let sources = [];
    if (Array.isArray(sourcesData)) {
        sources = sourcesData;
    } else if (typeof sourcesData === 'string' && sourcesData) {
        sources = [{ lang: 'English', url: sourcesData, download: '' }]; // Legacy fallback
    }

    if (!sources || sources.length === 0) return;

    // Use currentLanguage preference if available, else first
    let activeSource = sources.find(s => s.lang === currentLanguage) || sources[0];
    currentLanguage = activeSource.lang; // Update global

    // Definition for re-loader
    changeVideoByLang = (newSource) => {
        const time = player ? player.currentTime : 0;
        setVideoSource(sourcesData, poster, idForProgress, nextEp).then(() => {
            if(player && time > 0) player.currentTime = time;
        });
    };


    // 1. Clean up
    if (player) {
        player.destroy();
        player = null;
    }
    videoContainer.innerHTML = '';

    // 2. Determine Start Time (Async check)
    let startTime = 0;
    if (idForProgress) {
        startTime = await getProgress(idForProgress);
        if (startTime > 0) {
            console.log(`Resuming ${idForProgress} at ${startTime}s`);
        }
    }

    const url = activeSource.url;
    const downloadUrl = activeSource.download;

    const embedUrl = convertToEmbedUrl(url);
    const isEmbed = embedUrl !== url || url.includes('embed') || url.includes('drive.google.com') || url.includes('jiocloud.com');

    if (isEmbed) {
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.allow = "autoplay; encrypted-media; fullscreen";
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        videoContainer.appendChild(iframe);
        
        // Inject external controls for embeds
        if (sources.length > 1) setupAudioControls(sources);

    } else {
        const video = document.createElement('video');
        video.controls = true;
        video.crossOrigin = "anonymous";
        video.playsInline = true;
        
        if (poster) video.poster = poster;
        if (url) video.src = url;
        videoContainer.appendChild(video);

        player = new Plyr(video, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
            settings: ['quality', 'speed', 'loop'],
        });

        // Loop Listener for Audio
        player.on('ready', () => {
             if (sources.length > 1) setupAudioControls(sources);
             // Re-inject episodes button if needed (will happen via external call or check)
             if (currentMovie && currentMovie.type === 'series') setupPlayerControls(currentMovie);
        });

        // Set start time once metadata loaded
        player.on('loadedmetadata', () => {
            if (startTime > 0) player.currentTime = startTime;
        });

        // Listen Loop
        let lastSave = 0;
        let overlayShown = false;

        player.on('timeupdate', () => {
            const now = Date.now();
            const ct = player.currentTime;
            const dur = player.duration;

            // 1. Save Progress (Throttle 10s)
            if (now - lastSave > 10000) {
                if(player.playing && idForProgress) {
                    saveProgress(idForProgress, ct, dur);
                    lastSave = now;
                }
            }

            // 2. Auto Next Overlay
            if (nextEp && dur > 0 && (dur - ct) < 45 && !overlayShown) {
                const overlay = injectNextEpisodeOverlay(nextEp);
                // Trigger animation
                setTimeout(() => overlay.classList.add('visible'), 100);
                overlayShown = true;
            }
        });
        
        // Save on Pause
        player.on('pause', () => {
            if (idForProgress) saveProgress(idForProgress, player.currentTime, player.duration);
        });
    }

    // 3. Download Logic
    if (sources.length > 0) {
        downloadBtn.onclick = () => {
            // If multiple sources, we could show a modal. 
            // For now, just download current language.
            let dl = activeSource.download || activeSource.url;
            
            // Force direct download for Drive links
            if (dl) dl = getDriveDownloadLink(dl);
            
            if (dl) window.open(dl, '_blank');
            else alert("Download not available for this language.");
        };
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
        // Label update
        downloadBtn.innerHTML = `<i class="bi bi-download"></i> Download (${activeSource.lang})`;
    } else {
        downloadBtn.onclick = null;
        downloadBtn.classList.add('hidden');
    }
};

const loadMovie = async (id) => {
    try {
        const docRef = doc(db, "movies", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentMovie = { id: docSnap.id, ...docSnap.data() };


            renderPlayer(currentMovie);
            loadSimilar(currentMovie.genre); 

        } else {
            title.innerText = "Movie Not Found";
        }
    } catch (e) {
        console.error("Error loading movie:", e);
    }
};

const renderPlayer = (movie) => {
    document.title = `${movie.name} - StreamX`;

    // Info
    title.innerText = movie.name;
    date.innerText = movie.year || movie.date || 'N/A';
    rating.innerText = movie.imdb || movie.rating || 'N/A';
    gen.innerText = movie.genre;
    desc.innerText = movie.description || "No description available.";

    // Video
    if (movie.type === 'series' && movie.seasons) {
        setupSeriesUI(movie);
        const firstSeason = Object.keys(movie.seasons)[0];
        if (firstSeason) {
            playEpisode(movie.seasons[firstSeason][0]);
        }
    } else {
        seriesSection.classList.add('hidden');
        // Handle Sources
        let sources = movie.sources || [];
        if (sources.length === 0 && movie.url) {
            sources.push({ lang: 'Default', url: movie.url, download: movie.downloadUrl });
        }
        setVideoSource(sources, movie.bposter || movie.sposter, movie.id);
    }

    addListBtn.onclick = () => {
        addToWatchlist(movie);
    };
};

const setupSeriesUI = (movie) => {
    seriesSection.classList.remove('hidden');
    seasonSelect.innerHTML = '';

    const seasons = Object.keys(movie.seasons);
    seasons.forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.innerText = s;
        seasonSelect.appendChild(option);
    });

    seasonSelect.addEventListener('change', (e) => {
        renderEpisodes(movie.seasons[e.target.value]);
    });

    renderEpisodes(movie.seasons[seasons[0]]);
};

const renderEpisodes = (episodes) => {
    episodeList.innerHTML = '';
    episodes.forEach((ep, index) => {
        const div = document.createElement('div');
        div.classList.add('episode-item');
        div.innerHTML = `
            <div class="ep-number">${index + 1}</div>
            <div class="ep-info">
                <h4>${ep.title}</h4>
                <span class="ep-duration">${ep.duration || '??m'}</span>
            </div>
        `;
        div.addEventListener('click', () => {
            playEpisode(ep);
            document.querySelectorAll('.episode-item').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
        });
        episodeList.appendChild(div);
    });
};

const injectSeriesDrawer = (movie) => {
    let drawer = videoContainer.querySelector('.player-series-drawer');
    if (drawer) return drawer; // Return existing

    drawer = document.createElement('div');
    drawer.className = 'player-episode-drawer player-series-drawer';
    drawer.innerHTML = `
        <div class="drawer-header">
            <h3>Episodes</h3>
            <button class="close-drawer" id="close_drawer_btn"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="drawer-ep-list" id="drawer_ep_list"></div>
    `;

    const listContainer = drawer.querySelector('#drawer_ep_list');
    const seasons = Object.keys(movie.seasons);
    
    seasons.forEach(s => {
        const header = document.createElement('div');
        header.style.cssText = "padding: 5px 10px; font-size: 0.85rem; color: var(--primary); font-weight: 700; margin-top: 10px;";
        header.innerText = s;
        listContainer.appendChild(header);

        movie.seasons[s].forEach((ep, idx) => {
            const el = document.createElement('div');
            el.className = 'drawer-ep-item';
            if (player && player.sourceVideo === ep.url) el.classList.add('active'); 
            
            el.innerHTML = `
                <div class="drawer-ep-number">${idx + 1}</div>
                <div class="drawer-ep-info">
                    <h4>${ep.title}</h4>
                    <span>${ep.duration || '??m'}</span>
                </div>
            `;
            el.onclick = () => {
                playEpisode(ep);
                drawer.querySelectorAll('.drawer-ep-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
                drawer.classList.remove('open'); // Close on select
            };
            listContainer.appendChild(el);
        });
    });

    drawer.querySelector('#close_drawer_btn').onclick = () => drawer.classList.remove('open');
    videoContainer.appendChild(drawer);
    return drawer;
};

const setupPlayerControls = (movie) => {
    if (!player) return;
    if (document.getElementById('plyr_episodes_btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'plyr_episodes_btn';
    btn.className = 'plyr__controls__item plyr__control plyr__control--custom';
    btn.innerHTML = `<i class="bi bi-collection-play"></i> Episodes`;
    
    const controls = videoContainer.querySelector('.plyr__controls');
    if (controls) {
        const timeDisplay = controls.querySelector('.plyr__time--current');
        if (timeDisplay) {
             timeDisplay.parentNode.insertBefore(btn, timeDisplay.nextSibling);
        } else {
             controls.appendChild(btn);
        }
    }

    btn.onclick = () => {
        const episodes = [];
        Object.keys(movie.seasons).forEach(sName => {
            movie.seasons[sName].forEach(ep => {
                episodes.push({
                    label: ep.title,
                    sub: `${sName} • ${ep.duration || '??m'}`,
                    icon: '<i class="bi bi-play-circle"></i>',
                    raw: ep
                });
            });
        });

        const drawer = new PlayerDrawer(
            'player-series-drawer',
            'Episodes',
            episodes,
            (ep) => playEpisode(ep),
            (item) => item.raw.url === (player ? player.sourceVideo : '')
        );
        drawer.toggle();
    };
};

const playEpisode = (ep) => {
    // Unique ID for episode progress (e.g. movieID_epTitle)
    const epId = currentMovie ? `${currentMovie.id}_${ep.title.replace(/[^a-zA-Z0-9]/g, '')}` : null;
    
    // Find Next Episode
    let nextEp = null;
    if (currentMovie && currentMovie.seasons) {
        // Flatten episodes to find index
        const allEps = [];
        Object.values(currentMovie.seasons).forEach(sEps => allEps.push(...sEps));
        const idx = allEps.findIndex(e => e.title === ep.title); // Basic match
        if (idx !== -1 && idx < allEps.length - 1) {
            nextEp = allEps[idx + 1];
        }
    }

    // Handle Sources for Episode
    // Assuming ep has `sources` array or `url`. 
    // If mocking Series, we just have URL. 
    // If real, we should update Series Builder to support sources too? 
    // TASK Scope: "Start" was for general multi-language. 
    // Let's assume for now Series episodes might just have one URL unless updated.
    // Ideally, series data structure should also support [sources].
    // Updating Play logic to handle simple URL as source array.
    
    let epSources = ep.sources || [];
    if (epSources.length === 0 && ep.url) {
        epSources.push({ lang: 'Default', url: ep.url, download: ep.downloadUrl });
    }

    setVideoSource(epSources, '', epId, nextEp);
    
    if (currentMovie && currentMovie.type === 'series') {
        injectSeriesDrawer(currentMovie);
        // Controls setup will be triggered by player 'ready' event in setVideoSource
    }
};

const loadSimilar = async (genre) => {
    if (!genre) return;
    const mainGenre = genre.split(' ')[0];
    try {
        const q = query(collection(db, "movies"), where("genre", ">=", mainGenre), where("genre", "<=", mainGenre + '\uf8ff'), limit(4));
        const querySnapshot = await getDocs(q);

        similarGrid.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const m = doc.data();
            if (doc.id !== movieId) {
                const card = document.createElement('div');
                card.classList.add('similar-card');
                card.innerHTML = `<img src="${m.sposter}" loading="lazy" decoding="async" onerror="this.src='assets/img/no-poster.png'">`;
                card.onclick = () => window.location.href = `movies.html?id=${doc.id}`;
                similarGrid.appendChild(card);
            }
        });
    } catch (e) {
        console.error("Similar error:", e);
    }
};
