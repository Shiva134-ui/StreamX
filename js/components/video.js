import { showToast } from '../core/toast.js';

const videoContainer = document.getElementById('video_player_container');

export const openVideoPlayer = (movie) => {
    if (!movie.url) {
        showToast("No video link available for this title.", "error");
        return;
    }

    const embedUrl = convertToEmbedUrl(movie.url);

    videoContainer.innerHTML = `
        <div class="video-overlay">
            <div class="video-wrapper">
                <div class="video-header">
                    <h3>${movie.name}</h3>
                    <button id="close_video"><i class="bi bi-x-lg"></i></button>
                </div>
                <iframe src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            </div>
        </div>
    `;

    document.getElementById('close_video').onclick = closeVideoPlayer;
};

export const closeVideoPlayer = () => {
    videoContainer.innerHTML = '';
};

export const convertToEmbedUrl = (url) => {
    if (!url) return '';
    
    try {
        const urlObj = new URL(url);

        // Handle Google Drive
        if (urlObj.hostname.includes('drive.google.com')) {
            return url.replace(/\/view.*/, '/preview').replace(/\/edit.*/, '/preview');
        }

        // Handle YouTube
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            let videoId = '';
            if (urlObj.searchParams.has('v')) {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.pathname.includes('/embed/')) {
                videoId = urlObj.pathname.split('/embed/')[1];
            }
            
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            }
        }
    } catch (e) {
        // Not a full URL, maybe a path or already an ID
        if (url.length === 11) return `https://www.youtube.com/embed/${url}?autoplay=1&rel=0`;
    }

    return url; 
};

export const getDriveDownloadLink = (url) => {
    if (url.includes('drive.google.com')) {
        let id = '';
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) id = match[1];
        if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    return url;
};