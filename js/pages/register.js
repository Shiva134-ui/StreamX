import { registerWithEmail, loginWithGoogle } from '../core/auth.js';
import { showToast } from '../core/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register_form');
    const googleBtn = document.getElementById('google_btn');

    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await registerWithEmail(name, email, password);
            window.location.href = '../index.html';
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    googleBtn.onclick = async () => {
        try {
            await loginWithGoogle();
            window.location.href = '../index.html';
        } catch (err) {
            showToast(err.message, "error");
        }
    };
});
