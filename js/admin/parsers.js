/* global XLSX */

export const handleFile = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject("No file provided");

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve(jsonData);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const fetchGsheetData = async (url) => {
    if (!url) throw new Error("Please enter a URL");

    let id = '';
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) id = match[1];

    if (!id) throw new Error("Invalid Google Sheet URL");

    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Failed to fetch. Make sure sheet is Public.");
    const text = await res.text();

    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
};

export const parseDirectInput = (raw) => {
    if (!raw) throw new Error("Please paste some data");

    let json;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        throw new Error("Invalid JSON format");
    }

    let combinedData = [];

    // Case 1: Complex Object { movies: [], series: [] }
    if (!Array.isArray(json) && typeof json === 'object') {
        if (json.movies && Array.isArray(json.movies)) {
            combinedData = [...combinedData, ...json.movies.map(m => mapComplexItem(m, 'movie'))];
        }
        if (json.series && Array.isArray(json.series)) {
            combinedData = [...combinedData, ...json.series.map(s => mapComplexItem(s, 'series'))];
        }

        // If it's a single object that looks like a movie
        if (!json.movies && !json.series && (json.title || json.name)) {
            combinedData.push(mapComplexItem(json));
        }
    }
    // Case 2: Simple Array
    else if (Array.isArray(json)) {
        combinedData = json;
    } else {
        throw new Error("Input must be an Array or {movies:[], series:[]}");
    }
    return combinedData;
};

const mapComplexItem = (item, typeOverride) => {
    const type = item.type || typeOverride || 'movie';
    
    // NEW: Handle Multi-Language Sources
    let sources = [];
    
    // 1. Check if sources already exists (Direct JSON)
    if (item.sources && Array.isArray(item.sources)) {
        sources = item.sources;
    } else {
        // 2. Scan for language columns (e.g., url_hindi, dl_hindi)
        // Primary source first
        const primaryUrl = item.streamUrl || item.url || item.link || '';
        const primaryDl = item.downloadUrl || item.download || '';
        
        if (primaryUrl) {
            sources.push({ lang: 'English', url: primaryUrl, download: primaryDl });
        }

        // Look for others using regex or key patterns
        Object.keys(item).forEach(key => {
            if (key.startsWith('url_') || key.startsWith('link_') || key.startsWith('stream_')) {
                const lang = key.split('_')[1].charAt(0).toUpperCase() + key.split('_')[1].slice(1);
                const dlKey = `dl_${key.split('_')[1]}` || `download_${key.split('_')[1]}`;
                sources.push({
                    lang: lang,
                    url: item[key],
                    download: item[dlKey] || ''
                });
            }
        });
    }

    const newItem = {
        name: item.title || item.name || 'Untitled',
        year: item.releaseYear || item.year || item.date || '',
        genre: Array.isArray(item.genre) ? item.genre.join(', ') : (item.genre || 'Unknown'),
        rating: item.rating || '',
        description: item.description || '',
        sposter: item.sposter || '',
        bposter: item.bposter || '',
        url: sources.length > 0 ? sources[0].url : (item.streamUrl || item.url || item.link || ''), // Legacy fallback
        downloadUrl: sources.length > 0 ? sources[0].download : (item.downloadUrl || ''),
        sources: sources,
        type: type
    };

    if (type === 'series' && item.seasons && (Array.isArray(item.seasons) || typeof item.seasons === 'object')) {
        const seasonsMap = {};
        
        // Handle both Array (Legacy Bulk) and Object (Firestore Native)
        const rawSeasons = Array.isArray(item.seasons) ? item.seasons : Object.entries(item.seasons).map(([name, eps]) => ({ name, episodes: eps }));

        rawSeasons.forEach((season, idx) => {
            const sName = season.name || season.seasonName || `Season ${season.seasonNumber || idx + 1}`;
            const episodes = (season.episodes || []).map(ep => {
                // Check if ep already has sources
                let epSources = ep.sources || [];
                if (epSources.length === 0) {
                    const u = ep.streamUrl || ep.url || '';
                    const d = ep.downloadUrl || ep.download || '';
                    if (u) epSources.push({ lang: 'English', url: u, download: d });

                    // Scan episode object for url_hindi etc
                    Object.keys(ep).forEach(k => {
                        if (k.startsWith('url_') || k.startsWith('link_') || k.startsWith('stream_')) {
                            const lang = k.split('_')[1].charAt(0).toUpperCase() + k.split('_')[1].slice(1);
                            const dlKey = `dl_${k.split('_')[1]}` || `download_${k.split('_')[1]}`;
                            epSources.push({
                                lang: lang,
                                url: ep[k],
                                download: ep[dlKey] || ''
                            });
                        }
                    });
                }

                return {
                    title: ep.title || `Episode ${ep.episodeNumber || ''}`,
                    sources: epSources,
                    url: epSources.length > 0 ? epSources[0].url : (ep.streamUrl || ep.url || ''),
                    downloadUrl: epSources.length > 0 ? epSources[0].download : (ep.downloadUrl || ''),
                    size: ep.size || 0,
                    duration: ep.duration || '??m'
                };
            });
            seasonsMap[sName] = episodes;
        });
        newItem.seasons = seasonsMap;
    }
    return newItem;
};
