import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  projectId: "knitted-clone-t07pf",
  appId: "1:627919473892:web:757457755eccdef97fb0f1",
  apiKey: "AIzaSyDqmtQXpy42amJVIjPiSdzE_6ELnNG6ivg",
  authDomain: "knitted-clone-t07pf.firebaseapp.com",
  storageBucket: "knitted-clone-t07pf.firebasestorage.app",
  messagingSenderId: "627919473892"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-life-5d123d60-0593-4de2-9482-73faa9df53e1");
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Create/Update user document
    const userDocRef = doc(db, 'users', result.user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        userId: result.user.uid,
        email: result.user.email,
        createdAt: Date.now()
      });
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export { onAuthStateChanged, type User };
