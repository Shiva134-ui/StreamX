import { auth, db } from '../core/firebase-config.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getWatchlist, removeFromWatchlist } from '../components/watchlist.js';
import { showToast } from '../core/toast.js';
import { logoutUser } from '../core/auth.js';

console.log("Profile JS Loaded");

// --- CONFIGURATION ---
// REPLACE THESE WITH YOUR CLOUDINARY DETAILS
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dcdqwoola/image/upload";
const UPLOAD_PRESET = "movies-site";
// ---------------------

// Elements
const profileName = document.getElementById('profile_name');
const profileEmail = document.getElementById('profile_email');
const profileImg = document.getElementById('profile_img_large');
const activityList = document.getElementById('activity_list');
const watchlistGrid = document.getElementById('profile_watchlist_grid');
const logoutBtn = document.getElementById('logout_btn_header');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.profile-tab-content');

// Modal Elements
const editModal = document.getElementById('profile_modal');
const closeModal = document.getElementById('close_profile_modal');
const editBtn = document.getElementById('edit_profile_btn');
const editBadge = document.getElementById('edit_photo_btn');
const profileForm = document.getElementById('profile_form');
const inputName = document.getElementById('input_name');
const inputPhotoUrl = document.getElementById('input_photo_url');
const filePhoto = document.getElementById('file_photo');

// Crop Elements
const cropModal = document.getElementById('crop_modal');
const cropImage = document.getElementById('crop_image');
const cropConfirmBtn = document.getElementById('crop_confirm_btn');
const cancelCropBtn = document.getElementById('cancel_crop_btn');
const closeCropModal = document.getElementById('close_crop_modal');

let currentUser = null;
let cropper = null;
let croppedBlob = null;

// Auth Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        renderHeader(user);
        loadActivity(user);
        loadWatchlist();
    } else {
        window.location.href = '../index.html'; // Redirect if not logged in
    }
});

// Logout Listener
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await logoutUser();
            window.location.href = '../index.html';
        } catch (err) {
            console.error(err);
        }
    });
}

const renderHeader = (user) => {
    profileName.innerText = user.displayName || 'User';
    profileEmail.innerText = user.email;
    profileImg.src = user.photoURL || '../assets/img/user.jpg';
};

const loadActivity = async (user) => {
    const { renderLoader } = await import('../components/ui.js');
    renderLoader(activityList);
    
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            let html = '';

            // Joined
            if (data.joined) {
                html += createActivityItem('bi-calendar-check', 'Joined StreamX', new Date(data.joined).toLocaleDateString());
            }
            // Last Active
            if (data.lastLogin) {
                html += createActivityItem('bi-clock-history', 'Last Active', new Date(data.lastLogin).toLocaleString());
            }

            // Watchlist Count
            const count = data.watchlist ? data.watchlist.length : 0;
            html += createActivityItem('bi-bookmark-heart', 'Watchlist Items', `${count} movies saved`);

            activityList.innerHTML = html || '<p>No activity recorded.</p>';
        }
    } catch (e) {
        console.error("Activity Load Error", e);
        activityList.innerHTML = '<p>Could not load activity.</p>';
    }
};

const createActivityItem = (icon, title, desc) => {
    return `
    <div class="activity-item">
        <div class="activity-icon"><i class="bi ${icon}"></i></div>
        <div>
            <h4 style="margin:0; color:white;">${title}</h4>
            <span style="color:#aaa; font-size:0.9rem;">${desc}</span>
        </div>
    </div>
    `;
};

const loadWatchlist = async () => {
    watchlistGrid.innerHTML = '<p>Loading watchlist...</p>';
    const list = await getWatchlist();

    if (list.length === 0) {
        watchlistGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">Your watchlist is empty.</div>';
        return;
    }

    watchlistGrid.innerHTML = '';
    list.forEach((movie, index) => {
        const card = document.createElement('div');
        card.classList.add('movie-card'); // Reuse styles
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <img src="${movie.sposter}" loading="lazy">
            <div class="card-info">
                <h4>${movie.name}</h4>
                <span>${movie.date || ''}</span>
            </div>
            <button class="btn-remove-watchlist" title="Remove">×</button>
        `;

        // Remove Button
        card.querySelector('.btn-remove-watchlist').onclick = async (e) => {
            e.stopPropagation();
            if (confirm(`Remove ${movie.name} from watchlist?`)) {
                await removeFromWatchlist(movie);
                loadWatchlist(); // Refresh
                loadActivity(currentUser); // Refresh count
            }
        };

        // Click to play
        card.onclick = () => window.location.href = `movies.html?id=${movie.id}`;

        watchlistGrid.appendChild(card);
    });
};

// --- Tab Logic ---
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // UI
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Content
        const tabId = btn.getAttribute('data-tab');
        tabContents.forEach(c => c.classList.add('hidden'));
        document.getElementById(`tab_${tabId}`).classList.remove('hidden');
    });
});

// --- Edit Modal Logic ---
const openModal = () => {
    editModal.classList.remove('hidden');
    inputName.value = currentUser.displayName || '';
    inputPhotoUrl.value = currentUser.photoURL || '';
    filePhoto.value = ''; // Reset file
    croppedBlob = null; // Reset crop
};

editBtn.onclick = openModal;
editBadge.onclick = openModal;
closeModal.onclick = () => editModal.classList.add('hidden');
window.onclick = (e) => { 
    if (e.target == editModal) editModal.classList.add('hidden'); 
    if (e.target == cropModal) cropModal.classList.add('hidden');
};

// --- Crop Logic ---
filePhoto.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            cropImage.src = evt.target.result;
            cropModal.classList.remove('hidden');
            
            // Allow modal to show before init
            setTimeout(() => {
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1,
                    autoCropArea: 1,
                    background: false
                });
            }, 100);
        };
        reader.readAsDataURL(file);
        // Show filename
        const nameDisplay = document.getElementById('file_name_display');
        if (nameDisplay) nameDisplay.innerText = `Selected: ${file.name}`;
    }
    // Reset value so same file can be selected again if cancelled
    e.target.value = '';
});

const closeCropper = () => {
    cropModal.classList.add('hidden');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
};

closeCropModal.onclick = closeCropper;
cancelCropBtn.onclick = closeCropper;

cropConfirmBtn.onclick = () => {
    if (!cropper) return;
    cropper.getCroppedCanvas({ width: 400, height: 400 }).toBlob((blob) => {
        croppedBlob = blob;
        showToast("Photo Adjusted!", "success");
        closeCropper();
    }, 'image/jpeg', 0.9);
};

// Submit Profile Update
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = profileForm.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        let photoURL = inputPhotoUrl.value.trim();
        const file = croppedBlob || filePhoto.files[0]; // Use cropped blob if available

        // Cloudinary Upload
        if (file) {
            if (CLOUDINARY_URL.includes("YOUR_CLOUD_NAME")) {
                alert("Cloudinary is not configured in js/profile.js! Please add your Cloud Name and Preset.");
                throw new Error("Cloudinary not configured");
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);
            // Prefixing public_id is the most reliable way to force a folder
            formData.append('public_id', `movies-site/user_${currentUser.uid}_${Date.now()}`);

            btn.innerText = "Uploading Image...";
            const res = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.secure_url) {
                photoURL = data.secure_url;
            } else {
                throw new Error("Upload Failed: " + (data.error ? data.error.message : 'Unknown error'));
            }
        }

        // Update Auth Profile
        await updateProfile(currentUser, {
            displayName: inputName.value,
            photoURL: photoURL || currentUser.photoURL
        });

        // Update Firestore User Doc
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
            name: inputName.value,
            photo: photoURL || currentUser.photoURL
        });

        showToast("Profile Updated!", "success");
        editModal.classList.add('hidden');

        // Reflect Changes
        renderHeader(currentUser);

    } catch (err) {
        showToast("Error: " + err.message, "error");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerText = "Save Changes";
    }
});

// Mobile Sidebar Logic
