import { db, auth } from '../core/firebase-config.js';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { showToast } from '../core/toast.js';

// --- Dual Storage Logic (Firestore + LocalStorage) ---

export const addToWatchlist = async (movie) => {
    const user = auth.currentUser;
    if (!movie || (!movie.name && !movie.title)) {
        console.error("Cannot add invalid movie to watchlist", movie);
        return;
    }

    const movieName = movie.name || movie.title;
    const movieData = {
        id: movie.id || movieName.replace(/\s+/g, '_').toLowerCase(),
        name: movieName,
        sposter: movie.sposter || movie.poster || '',
        date: movie.date || movie.year || 'N/A',
        genre: movie.genre || 'Action'
    };

    if (user) {
        // Firestore Logic
        const userRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userRef, {
                watchlist: arrayUnion(movieData)
            });
            console.log("Added to Firestore Watchlist");
            showToast("Added to your secure cloud List!", "success");
        } catch (e) {
            // If user doc doesn't exist, create it
            if (e.code === 'not-found') {
                await setDoc(userRef, { watchlist: [movieData] });
                showToast("Created List and Added!", "success");
            } else if (e.code === 'permission-denied') {
                showToast("Permission Error: Check Firestore Rules", "error");
                console.error("Firestore Rules Blocked this. Allow read/write in Console.");
            } else {
                console.error("Firestore Error", e);
                saveLocal(movieData); // Fallback
            }
        }
    } else {
        // Guest Logic (LocalStorage)
        saveLocal(movieData);
        showToast("Added to Local Watchlist (Login to sync)", "info");
    }
};

const getLocalWatchlist = () => {
    try {
        const raw = localStorage.getItem('watchlist');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Error parsing local watchlist:", e);
        return [];
    }
};

const saveLocal = (movie) => {
    let list = getLocalWatchlist();
    // Avoid Duplicates
    if (!list.find(m => m.name === movie.name)) {
        list.push(movie);
        try {
            localStorage.setItem('watchlist', JSON.stringify(list));
        } catch (e) {
            console.error("Error saving local watchlist:", e);
        }
    }
};

export const getWatchlist = async () => {
    const user = auth.currentUser;
    let list = getLocalWatchlist();

    // Cloud (Merge)
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                const cloudList = docSnap.data().watchlist || [];
                // Merge unique
                cloudList.forEach(m => {
                    if (m && m.name && !list.find(lm => lm.name === m.name)) list.push(m);
                });
            }
        } catch (e) {
            console.log("Cloud Fetch Error", e);
        }
    }

    // Filter out malformed items (must have name or id)
    return list.filter(m => m && (m.name || m.id));
};

export const removeFromWatchlist = async (movie) => {
    const user = auth.currentUser;
    if (!movie || (!movie.name && !movie.id)) {
        console.warn("Attempted to remove invalid movie from watchlist");
        return;
    }

    const movieName = movie.name || movie.title || '';

    if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                let list = docSnap.data().watchlist || [];
                // Filter out by name as unique identifier
                const newList = list.filter(m => m && m.name !== movieName);

                await updateDoc(userRef, { watchlist: newList });
                showToast("Removed from Cloud List", "success");
            }
        } catch (e) {
            console.error("Remove Error", e);
            showToast("Error Removing: " + e.message, "error");
        }
    }

    // Always remove local
    let list = getLocalWatchlist();
    const newList = list.filter(m => m && m.name !== movieName);
    try {
        localStorage.setItem('watchlist', JSON.stringify(newList));
    } catch (e) {
        console.error("Error updating local watchlist:", e);
    }
    if (!user) showToast("Removed from Local List", "success");
};