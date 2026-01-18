import { db, auth } from '../core/firebase-config.js';
import { collection, addDoc, getDocs, updateDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { showToast } from '../core/toast.js';
import * as Parsers from '../admin/parsers.js';
import * as UI from '../admin/ui.js';

// --- Admin Guard ---
const ADMIN_EMAIL = 'sivamadesh.134@gmail.com';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        const data = docSnap.exists() ? docSnap.data() : {};

        const isAllowed = user.email === ADMIN_EMAIL || data.role === 'admin';

        if (!isAllowed) {
            showToast("Access Denied: Admins Only", "error");
            window.location.href = '../index.html';
        } else if (data.banned) {
            showToast("Your account is banned", "error");
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = '../index.html';
    }
});

// --- Elements ---
const dropZone = document.getElementById('drop_zone');
const fileInput = document.getElementById('file_input');
const uploadBtn = document.getElementById('upload_db_btn');
const gsheetInput = document.getElementById('gsheet_url');
const fetchGsheetBtn = document.getElementById('fetch_gsheet_btn');
const directInput = document.getElementById('direct_input');
const parseDirectBtn = document.getElementById('parse_direct_btn');

// Navigation
const manageMoviesLink = document.getElementById('nav_admin_movies');
const manageSeriesLink = document.getElementById('nav_admin_series');
const manageUsersLink = document.getElementById('nav_admin_users');
const uploadLink = document.getElementById('nav_upload');
const uploadHeader = document.getElementById('upload_header');

// Sections
const manageSection = document.getElementById('manage_section');
const manageTitle = document.getElementById('manage_title');
const usersSection = document.getElementById('users_section');
const adminSearch = document.getElementById('admin_search');
const adminUserSearch = document.getElementById('admin_user_search');
const previewContainer = document.getElementById('preview_container');

// State
let parsedData = [];
let adminMovies = [];
let allUsers = []; // Store users for filtering
let currentView = 'movie'; // 'movie', 'series'


// --- Logic ---

const animateValue = (obj, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
             obj.innerHTML = end.toLocaleString(); // Ensure exact end value
        }
    };
    window.requestAnimationFrame(step);
};

const loadDashboardStats = async () => {
    try {
        // 1. Get Movie Count
        const moviesSnap = await getDocs(collection(db, "movies"));
        const movieCount = moviesSnap.size;

        // 2. Get User Count
        const usersSnap = await getDocs(collection(db, "users"));
        const userCount = usersSnap.size;

        // 3. Smart Storage Calculation (Manual Size Priority)
        let totalGB = 0;
        let driveCount = 0;
        let ytCount = 0;

        moviesSnap.forEach(doc => {
             const m = doc.data();
             
             // If manual size exists, use it
             if (m.size && !isNaN(m.size) && m.size > 0) {
                 totalGB += parseFloat(m.size);
             } else {
                 // Fallback to Link Logic
                 const link = (m.url || m.link || "").toLowerCase();
                 if (link.includes('drive.google.com')) {
                     totalGB += 2.5;
                     driveCount++;
                 } else if (link.includes('youtube.com') || link.includes('youtu.be')) {
                     // 0 GB
                     ytCount++;
                 } else {
                     totalGB += 2.0; // Other
                 }
             }
        });
        
        totalGB = Math.round(totalGB);

        // 4. Update UI with Animation
        const movieEl = document.querySelector('.stat-card:nth-child(1) span');
        const userEl = document.querySelector('.stat-card:nth-child(2) span');
        const storageEl = document.querySelector('.stat-card:nth-child(3) span');

        if (movieEl) animateValue(movieEl, 0, movieCount, 1500);
        if (userEl) animateValue(userEl, 0, userCount, 1500);
        
        if (storageEl) {
             let startTimestamp = null;
             const duration = 1500;
             const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const val = Math.floor(progress * totalGB);
                storageEl.innerHTML = `${val} GB <span style="font-size:0.8rem; color:#888;">(Est.)</span>`;
                if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
            storageEl.title = `Includes ${driveCount} Drive Auto-Est & ${ytCount} YT Links`;
        }

    } catch (err) {
        console.error("Failed to load stats", err);
    }
};

// Call on load
loadDashboardStats();

const handleFile = (file) => {
    Parsers.handleFile(file).then(data => {
        parsedData = data;
        UI.renderPreview(parsedData, 'preview_container');
        if (parsedData.length > 0) uploadBtn.removeAttribute('disabled');
    }).catch(err => console.error(err));
};

// Drag & Drop
if (dropZone) {
    dropZone.onclick = () => fileInput.click();
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.classList.add('drag-over'); 
    });
    
    dropZone.addEventListener('dragleave', (e) => { 
        e.preventDefault(); 
        dropZone.classList.remove('drag-over'); 
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    });
}

if (fileInput) {
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
}

// Google Sheets
if (fetchGsheetBtn) {
    fetchGsheetBtn.onclick = async () => {
        const url = gsheetInput.value;
        fetchGsheetBtn.textContent = 'Fetching...';
        fetchGsheetBtn.disabled = true;
        try {
            parsedData = await Parsers.fetchGsheetData(url);
            UI.renderPreview(parsedData, 'preview_container');
            if (parsedData.length > 0) uploadBtn.removeAttribute('disabled');
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            fetchGsheetBtn.textContent = 'Fetch Data';
            fetchGsheetBtn.disabled = false;
        }
    };
}

// Direct Input
if (parseDirectBtn) {
    parseDirectBtn.addEventListener('click', () => {
        try {
            parsedData = Parsers.parseDirectInput(directInput.value.trim());
            UI.renderPreview(parsedData, 'preview_container');
            if (parsedData.length > 0) {
                uploadBtn.removeAttribute('disabled');
                showToast(`Parsed ${parsedData.length} items!`, "success");
            }
        } catch (e) {
            showToast("Invalid JSON: " + e.message, "error");
        }
    });
}

// Upload Logic
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        if (!parsedData || parsedData.length === 0) return showToast("No data to upload!", "error");

        uploadBtn.textContent = 'Uploading...';
        uploadBtn.disabled = true;

        let successCount = 0;
        let errorCount = 0;

        for (const row of parsedData) {
            try {
                // Normalize & Map
                const normalized = {};
                Object.keys(row).forEach(key => normalized[key.toLowerCase()] = row[key]);

                const movieData = {
                    name: normalized.name || normalized.title || 'Untitled',
                    genre: normalized.genre || 'Unknown',
                    year: normalized.year || normalized.date || '',
                    rating: normalized.rating || normalized.imdb || '',
                    description: normalized.description || normalized.plot || '',
                    link: normalized.link || normalized.url || '',
                    sposter: normalized.sposter || normalized.poster || '',
                    bposter: normalized.bposter || normalized.backdrop || ''
                };

                await addDoc(collection(db, "movies"), movieData);
                successCount++;
            } catch (err) {
                console.error("Upload error:", err);
                errorCount++;
            }
        }
        showToast(`Upload Complete! Success: ${successCount}, Errors: ${errorCount}`, successCount > 0 ? "success" : "error");
        uploadBtn.textContent = 'Upload to Database';
        uploadBtn.disabled = false;
    });
}

// --- Navigation & View Logic ---
const uploadSection = document.getElementById('upload_section');

// --- Navigation & View Logic ---
const hideAllSections = () => {
    uploadSection.classList.add('hidden');
    manageSection.classList.add('hidden');
    usersSection.classList.add('hidden');

    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
};

const showUploadSection = () => {
    hideAllSections();
    uploadLink.classList.add('active');
    document.getElementById('mobile_nav_upload')?.classList.add('active');
    uploadSection.classList.remove('hidden');
};

const showManageSection = (type) => {
    hideAllSections();
    manageSection.classList.remove('hidden');
    currentView = type;

    if (type === 'movie') {
        manageMoviesLink.classList.add('active');
        document.getElementById('mobile_nav_movies')?.classList.add('active');
        manageTitle.innerText = "Manage Movies";
    } else {
        manageSeriesLink.classList.add('active');
        document.getElementById('mobile_nav_series')?.classList.add('active');
        manageTitle.innerText = "Manage Series";
    }
    loadAdminMovies(type);
};

const showUsersSection = () => {
    hideAllSections();
    manageUsersLink.classList.add('active');
    document.getElementById('mobile_nav_users')?.classList.add('active');
    usersSection.classList.remove('hidden');
    loadUsers();
};

// Nav Listeners
uploadLink.onclick = showUploadSection;
manageMoviesLink.onclick = () => showManageSection('movie');
manageSeriesLink.onclick = () => showManageSection('series');
manageUsersLink.onclick = showUsersSection;

// Mobile Nav
document.getElementById('mobile_nav_upload').onclick = showUploadSection;
document.getElementById('mobile_nav_movies').onclick = () => showManageSection('movie');
document.getElementById('mobile_nav_series').onclick = () => showManageSection('series');
document.getElementById('mobile_nav_users').onclick = showUsersSection;


// --- Data Loading ---
const loadAdminMovies = async (filterType = currentView) => {
    const container = document.getElementById('movies_list_container');
    container.innerHTML = '<p>Loading...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "movies"));
        adminMovies = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if ((data.type || 'movie') === filterType) {
                adminMovies.push({ id: doc.id, ...data });
            }
        });
        UI.renderAdminMovies(adminMovies, 'movies_list_container', () => loadAdminMovies(filterType));
    } catch (e) {
        showToast("Error loading: " + e.message, "error");
    }
};

const loadUsers = async () => {
    const container = document.getElementById('users_list_container');
    container.innerHTML = '<p>Loading users...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        allUsers = []; // Reset
        querySnapshot.forEach((doc) => allUsers.push({ id: doc.id, ...doc.data() }));
        UI.renderUsers(allUsers, 'users_list_container', loadUsers);
    } catch (e) {
        if (e.message.includes('permission')) showToast("Error: Missing Permissions.", "error");
        else container.innerHTML = '<p>No users found yet.</p>';
    }
};

// Search Logic
if (adminSearch) {
    adminSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (currentView === 'movie' || currentView === 'series') {
            const filtered = adminMovies.filter(m => m.name.toLowerCase().includes(query));
            UI.renderAdminMovies(filtered, 'movies_list_container', () => loadAdminMovies(currentView));
        }
    });
}

// User Search Logic
if (adminUserSearch) {
    adminUserSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            (u.email && u.email.toLowerCase().includes(query)) || 
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query))
        );
        UI.renderUsers(filtered, 'users_list_container', loadUsers);
    });
}


// --- Modal & Series Builder Integration ---
document.addEventListener('admin:edit-movie', (e) => {
    openEditModal(e.detail);
});

const editModal = document.getElementById('edit_modal');
const editType = document.getElementById('edit_type');
const addSeasonBtn = document.getElementById('add_season_btn');
const addNewBtn = document.getElementById('add_new_btn');
const editForm = document.getElementById('edit_form');

const sourcesContainer = document.getElementById('sources_container');
const addSourceBtn = document.getElementById('add_source_btn');

const renderSourceRow = (source = {}) => {
    const div = document.createElement('div');
    div.classList.add('source-item');
    div.innerHTML = `
        <input type="text" class="sb-input source-lang" placeholder="Language" value="${source.lang || 'English'}">
        <input type="text" class="sb-input source-url" placeholder="Stream URL" value="${source.url || ''}">
        <input type="text" class="sb-input source-dl" placeholder="Download URL" value="${source.download || ''}">
        <button type="button" class="btn-remove-source"><i class="bi bi-trash"></i></button>
    `;

    div.querySelector('.btn-remove-source').onclick = () => div.remove();
    sourcesContainer.appendChild(div);
};

if (addSourceBtn) {
    addSourceBtn.onclick = () => renderSourceRow();
}

const collectSources = () => {
    const rows = document.querySelectorAll('#sources_container .source-item');
    const sources = [];
    rows.forEach(row => {
        const lang = row.querySelector('.source-lang').value.trim();
        const url = row.querySelector('.source-url').value.trim();
        const download = row.querySelector('.source-dl').value.trim();
        if (url) {
            sources.push({ lang: lang || 'Default', url, download });
        }
    });
    return sources;
};

const openEditModal = (movie) => {
    editModal.classList.remove('hidden');
    sourcesContainer.innerHTML = ''; // Clear Sources

    if (movie) {
        // Edit Mode
        const isSeries = (movie.type || 'movie') === 'series';
        document.getElementById('modal_title').innerText = isSeries ? "Edit Series" : "Edit Movie";
        
        document.getElementById('edit_id').value = movie.id;
        document.getElementById('edit_name').value = movie.name || '';
        document.getElementById('edit_year').value = movie.year || movie.date || '';
        document.getElementById('edit_genre').value = movie.genre || '';
        document.getElementById('edit_rating').value = movie.rating || '';
        document.getElementById('edit_sposter').value = movie.sposter || '';
        document.getElementById('edit_bposter').value = movie.bposter || '';
        // document.getElementById('edit_link').value = movie.url || ''; // Legacy
        // document.getElementById('edit_download').value = movie.downloadUrl || ''; // Legacy
        document.getElementById('edit_desc').value = movie.description || '';
        document.getElementById('edit_size').value = movie.size || ''; // Load Size
        editType.value = movie.type || 'movie';

        const seriesBuilder = document.getElementById('series_builder');

        // Logic Source Handling
        if (movie.sources && movie.sources.length > 0) {
            movie.sources.forEach(s => renderSourceRow(s));
        } else {
             // Fallback to legacy
             renderSourceRow({ lang: 'English', url: movie.url || '', download: movie.downloadUrl || '' });
        }

        UI.toggleSeriesMode(editType.value === 'series', seriesBuilder);

        if (movie.type === 'series') UI.renderSeriesBuilder(movie.seasons || {}, 'sb_container');
        else document.getElementById('sb_container').innerHTML = ''; // Clear

    } else {
        // Add Mode
        document.getElementById('modal_title').innerText = editType.value === 'series' ? "Add New Series" : "Add New Movie";
        document.getElementById('edit_id').value = '';
        editForm.reset();
        editType.value = 'movie';
        UI.toggleSeriesMode(false, document.getElementById('series_builder'));
        document.getElementById('sb_container').innerHTML = '';
        renderSourceRow({ lang: 'English' }); // Default row
    }
};

// Close Modal
document.getElementById('close_edit').onclick = () => editModal.classList.add('hidden');
window.onclick = (e) => { if (e.target == editModal) editModal.classList.add('hidden'); };

if (addNewBtn) addNewBtn.onclick = () => openEditModal(null);

if (editType) {
    editType.addEventListener('change', () => {
        UI.toggleSeriesMode(editType.value === 'series', document.getElementById('series_builder'), document.getElementById('group_link'), document.getElementById('group_download'));
    });
}

if (addSeasonBtn) {
    addSeasonBtn.onclick = () => {
        const container = document.getElementById('sb_container');
        const count = container.children.length + 1;
        UI.addSeasonBlock(`Season ${count}`, [], container);
    };
}


// --- Form Submit ---
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = editType.value;
        const sources = collectSources();

        if (type === 'movie' && sources.length === 0) return showToast("At least one Video Source is required!", "error");

        const id = document.getElementById('edit_id').value;
        const btn = editForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            // Use first source as primary for legacy support
            const primarySource = sources.length > 0 ? sources[0] : { url: '', download: '' };

            const dataToUpdate = {
                name: document.getElementById('edit_name').value,
                year: document.getElementById('edit_year').value,
                date: document.getElementById('edit_year').value,
                genre: document.getElementById('edit_genre').value,
                rating: document.getElementById('edit_rating').value,
                size: parseFloat(document.getElementById('edit_size').value) || 0,
                imdb: document.getElementById('edit_rating').value,
                sposter: document.getElementById('edit_sposter').value,
                bposter: document.getElementById('edit_bposter').value,
                url: primarySource.url, // Legacy
                link: primarySource.url, // Legacy
                downloadUrl: primarySource.download, // Legacy
                sources: sources, // NEW
                description: document.getElementById('edit_desc').value,
                type: type
            };

            if (type === 'series') {
                const seasonsData = UI.scrapeSeriesBuilder('sb_container');
                
                let seriesTotalSize = 0;
                Object.values(seasonsData).forEach(episodes => {
                    episodes.forEach(ep => {
                        if (ep.size) seriesTotalSize += ep.size;
                    });
                });
                
                if (seriesTotalSize > 0) dataToUpdate.size = seriesTotalSize;

                if (Object.keys(seasonsData).length > 0) dataToUpdate.seasons = seasonsData;
                else delete dataToUpdate.seasons;
            } else {
                delete dataToUpdate.seasons;
            }

            if (id) {
                await updateDoc(doc(db, "movies", id), dataToUpdate);
                showToast("Updated Successfully!", "success");
            } else {
                await addDoc(collection(db, "movies"), { ...dataToUpdate, addedAt: new Date().toISOString() });
                showToast("Added Successfully!", "success");
            }
            
            editModal.classList.add('hidden');
            loadAdminMovies(editType.value);
            loadDashboardStats();

        } catch (err) {
            showToast("Error: " + err.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });
}

// --- Action Event Listeners ---
document.addEventListener('admin:delete-movie', async (e) => {
    const { id, callback } = e.detail;
    if (confirm("Are you sure you want to delete this content?")) {
        try {
            await deleteDoc(doc(db, "movies", id));
            showToast("Content deleted!", "success");
            if (callback) callback();
        } catch (err) {
            showToast("Delete failed: " + err.message, "error");
        }
    }
});

document.addEventListener('admin:ban-user', async (e) => {
    const { id, ban, callback } = e.detail;
    try {
        await updateDoc(doc(db, "users", id), { banned: ban });
        showToast(`User ${ban ? 'Banned' : 'Unbanned'}!`, "success");
        if (callback) callback();
    } catch (err) {
        showToast("Action failed: " + err.message, "error");
    }
});

document.addEventListener('admin:toggle-role', async (e) => {
    const { id, role, callback } = e.detail;
    try {
        await updateDoc(doc(db, "users", id), { role: role });
        showToast(`User role updated to ${role}!`, "success");
        if (callback) callback();
    } catch (err) {
        showToast("Action failed: " + err.message, "error");
    }
});

// Side effects: Sidebar logic
document.addEventListener('click', (e) => {
    const target = e.target;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar_overlay');



    if (target.id === 'close_sidebar' || target.closest('#close_sidebar') || target.id === 'sidebar_overlay') {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
});

// --- User Management Events (Added) ---

document.addEventListener('admin:delete-user', async (e) => {
    const { id, callback } = e.detail;
    try {
        await deleteDoc(doc(db, "users", id));
        showToast("User deleted permanently.", "success");
        if (callback) callback();
    } catch (error) {
        console.error("Error deleting user:", error);
        showToast("Failed to delete user.", "error");
    }
});

// Edit User Modal Logic
const editUserModal = document.getElementById('edit_user_modal');
const closeUserModal = document.getElementById('close_user_modal');
const editUserForm = document.getElementById('edit_user_form');
const modalDeleteUserBtn = document.getElementById('modal_delete_user_btn');

if (closeUserModal) {
    closeUserModal.onclick = () => editUserModal.classList.add('hidden');
}

document.addEventListener('admin:edit-user', (e) => {
    const user = e.detail;
    if (!user) return;
    
    document.getElementById('edit_user_id').value = user.id;
    document.getElementById('edit_user_name').value = user.name || '';
    document.getElementById('edit_user_photo').value = user.photo || '';
    document.getElementById('edit_user_email').value = user.email || '';
    
    // Populate Role & Status
    document.getElementById('edit_user_role').value = user.role || 'user';
    document.getElementById('edit_user_status').value = user.banned ? 'banned' : 'active';
    
    editUserModal.classList.remove('hidden');
});

// Modal Delete Button
if (modalDeleteUserBtn) {
    modalDeleteUserBtn.onclick = () => {
        const id = document.getElementById('edit_user_id').value;
        if(confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
            document.dispatchEvent(new CustomEvent('admin:delete-user', { detail: { 
                id, 
                callback: () => {
                    editUserModal.classList.add('hidden');
                    loadUsers();
                }
            }}));
        }
    };
}

if (editUserForm) {
    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit_user_id').value;
        const name = document.getElementById('edit_user_name').value;
        const photo = document.getElementById('edit_user_photo').value;
        const role = document.getElementById('edit_user_role').value;
        const status = document.getElementById('edit_user_status').value;
        
        try {
            await updateDoc(doc(db, "users", id), {
                name: name,
                photo: photo,
                role: role,
                banned: status === 'banned' // Convert string to boolean
            });
            showToast("User updated successfully!", "success");
            editUserModal.classList.add('hidden');
            loadUsers(); // Refresh list
        } catch (error) {
            console.error("Error updating user:", error);
            showToast("Failed to update user.", "error");
        }
    });
}

// Send Notification Logic
const btnSendNotify = document.getElementById('btn_send_notify');
const txtNotifyMsg = document.getElementById('notify_user_msg');

if (btnSendNotify && txtNotifyMsg) {
    btnSendNotify.onclick = async () => {
        const msg = txtNotifyMsg.value.trim();
        const uid = document.getElementById('edit_user_id').value;

        if (!msg) return showToast("Please enter a message.", "error");
        if (!uid) return showToast("User ID missing.", "error");

        btnSendNotify.disabled = true;
        btnSendNotify.innerHTML = '<i class="bi bi-hourglass-split"></i>';

        try {
            await addDoc(collection(db, `users/${uid}/notifications`), {
                message: msg,
                date: new Date().toISOString(),
                read: false,
                type: 'admin'
            });
            showToast("Notification sent!", "success");
            txtNotifyMsg.value = '';
        } catch (error) {
            console.error("Error sending notification:", error);
            showToast("Failed to send.", "error");
        } finally {
            btnSendNotify.disabled = false;
            btnSendNotify.innerHTML = '<i class="bi bi-send"></i>';
        }
    };
}