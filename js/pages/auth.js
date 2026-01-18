import { loginWithGoogle, registerWithEmail, loginWithEmail } from '../core/auth.js';
import { showToast } from '../core/toast.js';

const authForm = document.getElementById('auth_form');
const formTitle = document.getElementById('form_title');
const formSubtitle = document.getElementById('form_subtitle');
const submitBtn = document.getElementById('submit_btn');
const toggleAuth = document.getElementById('toggle_auth');
const nameGroup = document.getElementById('name_group');
const errorMsg = document.getElementById('error_msg');
const errorSpan = errorMsg.querySelector('span'); // Target text span
const googleBtn = document.getElementById('google_btn');

let isRegister = false;

// Toggle between Login and Register
toggleAuth.addEventListener('click', () => {
    isRegister = !isRegister;
    if (isRegister) {
        formTitle.innerText = "Sign Up";
        formSubtitle.innerText = "Join StreamX today";
        submitBtn.innerText = "Create Account";
        toggleAuth.innerText = "Sign in now";
        document.getElementById('auth_footer').childNodes[0].nodeValue = "Already have an account? ";
        nameGroup.classList.remove('hidden');
    } else {
        formTitle.innerText = "Sign In";
        formSubtitle.innerText = "Welcome back to StreamX";
        submitBtn.innerText = "Sign In";
        toggleAuth.innerText = "Sign up now";
        document.getElementById('auth_footer').childNodes[0].nodeValue = "New to StreamX? ";
        nameGroup.classList.add('hidden');
    }
    errorMsg.style.display = 'none';
});

// Handle Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";
    errorMsg.style.display = 'none';

    try {
        if (isRegister) {
            await registerWithEmail(name, email, password);
        } else {
            await loginWithEmail(email, password);
        }
        // Success - Redirect
        window.location.href = '../index.html';
    } catch (err) {
        // Show Error
        errorSpan.innerText = err.message.replace("Firebase: ", "");
        errorMsg.style.display = 'flex'; // Use flex to align icon
        submitBtn.disabled = false;
        submitBtn.innerText = isRegister ? "Create Account" : "Sign In";
    }
});

// Google Login
googleBtn.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
        window.location.href = '../index.html';
    } catch (err) {
        errorSpan.innerText = err.message;
        errorMsg.style.display = 'flex';
    }
});
