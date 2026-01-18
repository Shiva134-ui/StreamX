import { loginWithGoogle, registerWithEmail, loginWithEmail, logoutUser } from '../core/auth.js';
import { showToast } from '../core/toast.js';

export const modalContainer = document.getElementById('modal_container');

export const renderLoginModal = () => {
    modalContainer.innerHTML = `
        <div class="modal-overlay animate-fade-in">
            <div class="modal-content glass-effect animate-fade-up">
                <span class="close-modal">&times;</span>
                <h2>Welcome Back</h2>
                <div class="auth-tabs">
                    <button class="active" id="tab_login">Login</button>
                    <button id="tab_register">Register</button>
                </div>
                
                <form id="auth_form">
                    <div class="input-group hidden" id="name_group">
                        <i class="bi bi-person"></i>
                        <input type="text" id="name" placeholder="Full Name">
                    </div>
                    <div class="input-group">
                        <i class="bi bi-envelope"></i>
                        <input type="email" id="email" placeholder="Email Address" required>
                    </div>
                    <div class="input-group">
                        <i class="bi bi-lock"></i>
                        <input type="password" id="password" placeholder="Password" required>
                    </div>
                    
                    <button type="submit" class="btn-primary full-width" id="submit_btn">Sign In</button>
                </form>

                <div class="divider"><span>OR</span></div>
                
                <button class="btn-google" id="google_btn">
                    <i class="bi bi-google"></i> Continue with Google
                </button>
            </div>
        </div>
    `;

    setupModalEvents();
};

const setupModalEvents = () => {
    const overlay = document.querySelector('.modal-overlay');
    const closeBtn = document.querySelector('.close-modal');
    const tabLogin = document.getElementById('tab_login');
    const tabRegister = document.getElementById('tab_register');
    const authForm = document.getElementById('auth_form');
    const nameGroup = document.getElementById('name_group');
    const submitBtn = document.getElementById('submit_btn');
    const googleBtn = document.getElementById('google_btn');

    let isRegister = false;

    // Close Modal
    const closeModal = () => modalContainer.innerHTML = '';
    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    }

    // Toggle Tabs
    tabLogin.onclick = () => {
        isRegister = false;
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        nameGroup.classList.add('hidden');
        submitBtn.textContent = 'Sign In';
        document.querySelector('.modal-content h2').textContent = 'Welcome Back';
    };

    tabRegister.onclick = () => {
        isRegister = true;
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        nameGroup.classList.remove('hidden');
        submitBtn.textContent = 'Create Account';
        document.querySelector('.modal-content h2').textContent = 'Join StreamX';
    };

    // Google Login
    googleBtn.onclick = async () => {
        try {
            await loginWithGoogle();
            closeModal();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // Form Submit
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            if (isRegister) {
                const name = document.getElementById('name').value;
                await registerWithEmail(name, email, password);
            } else {
                await loginWithEmail(email, password);
            }
            closeModal();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
};

// --- Global Loader Helper ---
export const renderLoader = (container) => {
    if (!container) return;
    container.innerHTML = `
        <div class="loader-container">
            <div class="loader-bar"></div>
            <div class="loader-bar"></div>
            <div class="loader-bar"></div>
        </div>
    `;
};

export const updateUserUI = (user) => {
    const profileSection = document.querySelector('.user-profile');
    const headerProfile = document.getElementById('header_profile');
    const headerAvatar = document.getElementById('header_avatar');
    const loginBtn = document.getElementById('login_btn');
    const userName = document.getElementById('user_name');
    const userAvatar = document.getElementById('user_avatar');

    // Bottom Nav Admin logic
    const bottomNav = document.querySelector('.bottom-nav');
    const existingMobileAdmin = document.getElementById('mobile_admin_tab');

    if (user) {
        // Desktop Sidebar Profile
        if (profileSection) profileSection.style.display = 'flex';
        // Mobile Header Profile
        if (headerProfile) {
            headerProfile.style.display = 'flex';
            headerProfile.onclick = () => {
                const isPagesDir = window.location.pathname.includes('/pages/');
                window.location.href = isPagesDir ? 'profile.html' : 'pages/profile.html';
            };
        }
        // Determine default image path based on location
        const isPagesDir = window.location.pathname.includes('/pages/');
        const defaultImg = isPagesDir ? '../assets/img/user.jpg' : 'assets/img/user.jpg';

        if (headerAvatar) headerAvatar.src = user.photoURL || defaultImg;

        if (loginBtn) loginBtn.style.display = 'none';
        if (userName) userName.textContent = user.displayName || "User";
        if (userAvatar) userAvatar.src = user.photoURL || defaultImg;

        // Admin Access
        if (user.isAdmin) {
            // Sidebar Admin Link
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && !document.getElementById('admin_dashboard_link')) {
                const li = document.createElement('li');
                li.id = 'admin_dashboard_link';
                const isPagesDir = window.location.pathname.includes('/pages/');
                const adminPath = isPagesDir ? 'admin.html' : 'pages/admin.html';
                li.innerHTML = `<a href="${adminPath}"><i class="bi bi-shield-lock-fill"></i> <span>Admin</span></a>`;
                navLinks.appendChild(li);
            }

            // Bottom Nav Admin Tab
            if (bottomNav && !existingMobileAdmin) {
                const btn = document.createElement('button');
                btn.className = 'bottom-nav-item';
                btn.id = 'mobile_admin_tab';
                btn.innerHTML = `
                    <i class="bi bi-shield-lock-fill"></i>
                    <span>Admin</span>
                `;
                btn.onclick = () => {
                    const isPagesDir = window.location.pathname.includes('/pages/');
                    window.location.href = isPagesDir ? 'admin.html' : 'pages/admin.html';
                };
                bottomNav.appendChild(btn);
            }
        }

    } else {
        if (profileSection) profileSection.style.display = 'none';
        if (headerProfile) headerProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';

        const adminLink = document.getElementById('admin_dashboard_link');
        if (adminLink) adminLink.remove();

        if (existingMobileAdmin) existingMobileAdmin.remove();
    }
};