// ============================================
// KONFIGURASI FIREBASE - GANTI DENGAN CONFIG ANDA
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBs3mbLNCmpJq9QzRCW75WWKxVRNhbnF7g",
    authDomain: "bero-shop.firebaseapp.com",
    projectId: "bero-shop",
    storageBucket: "bero-shop.firebasestorage.app",
    messagingSenderId: "705199135786",
    appId: "1:705199135786:web:ab18c2532882c41c3df753",
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ============================================
// PANDUAN SETUP FIREBASE:
// 1. Buka https://console.firebase.google.com
// 2. Buat project baru
// 3. Aktifkan Firestore Database
// 4. Copy config dari Project Settings > General
// 5. Ganti firebaseConfig di atas
// ============================================
