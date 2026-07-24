// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCU44Iip7IUB1LQ-8m7N_hxw4r0Stz_6pc",
    authDomain: "project-2-9471f.firebaseapp.com",
    databaseURL: "https://project-2-9471f-default-rtdb.firebaseio.com",
    projectId: "project-2-9471f",
    storageBucket: "project-2-9471f.firebasestorage.app",
    messagingSenderId: "999368240286",
    appId: "1:999368240286:web:201ab1643548ed68ba1f8f",
    measurementId: "G-Y3L5Q7V4C9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };