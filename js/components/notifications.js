import { db, auth } from '../core/firebase-config.js';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, writeBatch, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

export const initNotifications = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setupNotificationListener(user.uid);
        } else {
            // Clear UI if logged out
            const badge = document.getElementById('notif_badge');
            if(badge) badge.classList.add('hidden');
        }
    });

    // Toggle Dropdown
    const btn = document.getElementById('notification_btn');
    const dropdown = document.getElementById('notification_dropdown');
    
    if (btn && dropdown) {
        btn.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        };

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // Mark All Read
    const markReadBtn = document.getElementById('mark_all_read');
    if (markReadBtn) {
        markReadBtn.onclick = () => markAllAsRead();
    }
};

let unsubscribe = null;
let currentUserId = null;

const setupNotificationListener = (uid) => {
    if (unsubscribe) unsubscribe(); // Clear prev listener
    currentUserId = uid;

    const notifRef = collection(db, `users/${uid}/notifications`);
    const q = query(notifRef, orderBy('date', 'desc')); // Get all, sort by newest

    unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({ id: doc.id, ...data });
            if (!data.read) unreadCount++;
        });

        updateBadge(unreadCount);
        renderNotifications(notifications);
    }, (error) => {
        console.error("Notif listener error:", error);
    });
};

const updateBadge = (count) => {
    const badge = document.getElementById('notif_badge');
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count > 9 ? '9+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
};

const renderNotifications = (notifications) => {
    const container = document.getElementById('notif_list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<p class="empty-notif">No new notifications</p>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.read ? 'read' : 'unread'}" onclick="markAsRead('${n.id}')">
            <div class="notif-icon">
                <i class="bi bi-info-circle-fill"></i>
            </div>
            <div class="notif-content">
                <p class="notif-msg">${escapeHtml(n.message)}</p>
                <div class="notif-date">${timeAgo(new Date(n.date))}</div>
            </div>
        </div>
    `).join('');
};

// Make accessible to onclick
window.markAsRead = async (id) => {
    if (!currentUserId) return;
    try {
        const ref = doc(db, `users/${currentUserId}/notifications`, id);
        await updateDoc(ref, { read: true });
    } catch (e) {
        console.error("Error marking read:", e);
    }
};

const markAllAsRead = async () => {
    if (!currentUserId) return;
    const notifRef = collection(db, `users/${currentUserId}/notifications`);
    const q = query(notifRef, where('read', '==', false));

    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    } catch (e) {
        console.error("Error marking all read:", e);
    }
};

// Utils
const escapeHtml = (text) => {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};
