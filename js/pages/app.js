/* Main Application Entry Point */
import { loadHome } from './home.js';
import { initNavigation, handleDeepLink } from '../components/navigation.js';
import { initSearch } from '../components/search.js';
import { initNotifications } from '../components/notifications.js';
import { onUserChange } from '../core/auth.js';
import { updateUserUI, renderLoginModal } from '../components/ui.js';
import { initScrollReveal, initParallax, initTiltEffect } from '../core/effects.js';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Views
    loadHome();
    initNavigation();
    initSearch(); 
    initNotifications(); 

    // 2. Initialize Helper UI (Mobile Menu, etc in App shell)
    initGlobalUI();

    // 3. Initialize Advanced Effects (Scroll, Parallax, Tilt)
    initScrollReveal();
    initParallax();
    initTiltEffect();

    let isFirstLoad = true;
    // 3. Auth Listener
    onUserChange((user, error) => {
        if (error === "BANNED") {
            alert("Your account has been banned.");
            window.location.reload();
        }
        updateUserUI(user);

        // Run deep link only once after auth is settled
        if (isFirstLoad) {
            handleDeepLink();
            isFirstLoad = false;
        }
    });
});

const initGlobalUI = () => {
    // Sidebar Toggle
    // Sidebar Toggle

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar_overlay');
    const closeSidebar = document.getElementById('close_sidebar');

    const mobileToggle = document.getElementById('mobile_toggle');

    const toggleSidebar = () => {
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    };

    if (mobileToggle) mobileToggle.addEventListener('click', toggleSidebar);
    if (closeSidebar) closeSidebar.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    // Logout
    const logoutBtn = document.getElementById('logout_btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { logoutUser } = await import('../core/auth.js');
            logoutUser();
        });
    }

    // Login
    const loginBtn = document.getElementById('login_btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const isPagesDir = window.location.pathname.includes('/pages/');
            window.location.href = isPagesDir ? 'auth.html' : 'pages/auth.html';
        });
    }
};