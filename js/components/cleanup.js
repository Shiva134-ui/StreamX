import { db, auth } from '../core/firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

/**
 * Purges malformed "undefined" items from the current user's watchlist in Firestore
 * and LocalStorage.
 */
export const cleanupWatchlist = async () => {
    const user = auth.currentUser;
    
    // 1. Cleanup LocalStorage
    try {
        const localList = JSON.parse(localStorage.getItem('watchlist') || '[]');
        const cleanLocal = localList.filter(m => {
            if (!m) return false;
            const name = String(m.name || '');
            return name && name !== 'undefined' && name !== 'Untitled';
        });
        localStorage.setItem('watchlist', JSON.stringify(cleanLocal));
        console.log("Local Watchlist Cleaned");
    } catch (e) {
        console.error("Local cleanup error", e);
    }

    // 2. Cleanup Firestore
    if (user) {
        const userRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const cloudList = docSnap.data().watchlist || [];
                const cleanCloud = cloudList.filter(m => {
                    if (!m) return false;
                    const name = String(m.name || '');
                    // Also check for null/undefined objects
                    return name && name !== 'undefined' && name !== 'Untitled';
                });

                if (cleanCloud.length !== cloudList.length) {
                    await updateDoc(userRef, { watchlist: cleanCloud });
                    console.log(`Firestore Watchlist Cleaned: Removed ${cloudList.length - cleanCloud.length} items`);
                }
            }
        } catch (e) {
            console.error("Firestore cleanup error", e);
        }
    }
};
