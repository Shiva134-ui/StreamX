import { auth, db } from './firebase-config.js'; // Import DB
import {
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"; // Import Firestore

const googleProvider = new GoogleAuthProvider();

// Google Login
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user exists to preserve joined date
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        const userData = {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            lastLogin: new Date().toISOString()
        };

        if (!docSnap.exists()) {
            userData.joined = new Date().toISOString();
        }

        // Save User to Firestore
        await setDoc(userRef, userData, { merge: true });

        return user;
    } catch (error) {
        console.error("Google Login Error:", error);
        throw error;
    }
};

// Email Register
export const registerWithEmail = async (name, email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });

        // Save User to Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            photo: null,
            joined: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        });

        return user;
    } catch (error) {
        throw error;
    }
};

// Email Login
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Last Login
        await setDoc(doc(db, "users", user.uid), {
            lastLogin: new Date().toISOString()
        }, { merge: true });

        return user;
    } catch (error) {
        throw error;
    }
}

// Logout
export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// Auth State Monitor
export const onUserChange = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Fetch extra data from Firestore (role, banned status)
            const userRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.banned) {
                    await signOut(auth);
                    callback(null, "BANNED");
                    return;
                }
                // Attach role to user object for app logic
                user.isAdmin = data.role === 'admin' || user.email === 'sivamadesh.134@gmail.com';
            }
        }
        callback(user);
    });
};