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

const saveLocal = (movie) => {
    let list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    // Avoid Duplicates
    if (!list.find(m => m.name === movie.name)) {
        list.push(movie);
        localStorage.setItem('watchlist', JSON.stringify(list));
    }
};

export const getWatchlist = async () => {
    const user = auth.currentUser;
    let list = [];

    // Local
    const localList = JSON.parse(localStorage.getItem('watchlist') || '[]');
    list = [...localList];

    // Cloud (Merge)
    if (user) {
        try {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                const cloudList = docSnap.data().watchlist || [];
                // Merge unique
                cloudList.forEach(m => {
                    if (!list.find(lm => lm.name === m.name)) list.push(m);
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
    const movieId = movie.id || (movieName ? movieName.replace(/\s+/g, '_').toLowerCase() : 'unknown');

    // We need to match the EXACT object to remove from array, or filter the array and update.
    // arrayRemove only works with exact object match which is tricky if object changed.
    // Better approach: Read, Filter, Write.

    if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                let list = docSnap.data().watchlist || [];
                // Filter out by name as unique identifier
                const newList = list.filter(m => m.name !== movie.name);

                await updateDoc(userRef, { watchlist: newList });
                showToast("Removed from Cloud List", "success");
            }
        } catch (e) {
            console.error("Remove Error", e);
            showToast("Error Removing: " + e.message, "error");
        }
    }

    // Always remove local
    let list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const newList = list.filter(m => m.name !== movie.name);
    localStorage.setItem('watchlist', JSON.stringify(newList));
    if (!user) showToast("Removed from Local List", "success");
};