// ============================================
// AUTHENTICATION SYSTEM
// ============================================

// Check session saat load
document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
});

// Toggle form login/register
function toggleForm(type) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (type === 'register') {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    } else {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
    
    // Clear errors
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
}

// ============================================
// REGISTER - DETEKSI USER SUDAH ADA
// ============================================
async function handleRegister() {
    const username = document.getElementById('regUsername').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const pin = document.getElementById('regPin').value;
    const errorDiv = document.getElementById('registerError');
    
    // Validasi
    if (!username || !password || !pin) {
        errorDiv.textContent = 'Semua field wajib diisi!';
        return;
    }
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Password tidak cocok!';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password minimal 6 karakter!';
        return;
    }
    
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        errorDiv.textContent = 'PIN harus 6 digit angka!';
        return;
    }
    
    try {
        // CEK: Apakah username sudah ada?
        const userRef = db.collection('users').doc(username);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            errorDiv.textContent = 'Username sudah terdaftar! Silakan login.';
            return;
        }
        
        // Jika belum ada, tambahkan user baru
        const hashedPassword = await hashString(password);
        const hashedPin = await hashString(pin);
        
        await userRef.set({
            username: username,
            password: hashedPassword,
            pin: hashedPin,
            saldo: 0, // Saldo awal 0, bisa ditambahkan manual via Firestore
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Buat session
        await createSession(username);
        
        // Redirect ke dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Register error:', error);
        errorDiv.textContent = 'Terjadi kesalahan. Coba lagi.';
    }
}

// ============================================
// LOGIN - CEK USERNAME & PASSWORD
// ============================================
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!username || !password) {
        errorDiv.textContent = 'Username dan password wajib diisi!';
        return;
    }
    
    try {
        // Cek apakah user ada
        const userRef = db.collection('users').doc(username);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            errorDiv.textContent = 'Username tidak ditemukan! Silakan daftar.';
            return;
        }
        
        const userData = userDoc.data();
        const hashedPassword = await hashString(password);
        
        // Verifikasi password
        if (userData.password !== hashedPassword) {
            errorDiv.textContent = 'Password salah!';
            return;
        }
        
        // Login berhasil, buat session
        await createSession(username);
        
        // Redirect ke dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Terjadi kesalahan. Coba lagi.';
    }
}

// ============================================
// SESSION MANAGEMENT - KEAMANAN COOKIE
// ============================================
async function createSession(username) {
    const sessionId = generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire 24 jam
    
    // Simpan session ke Firestore
    await db.collection('sessions').doc(sessionId).set({
        username: username,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
        active: true
    });
    
    // Simpan session ID ke localStorage (sebagai cookie alternative)
    localStorage.setItem('digiflazz_session', sessionId);
    localStorage.setItem('digiflazz_user', username);
}

async function checkExistingSession() {
    const sessionId = localStorage.getItem('digiflazz_session');
    const username = localStorage.getItem('digiflazz_user');
    
    if (!sessionId || !username) return;
    
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        
        if (sessionDoc.exists && sessionDoc.data().active) {
            const expiresAt = sessionDoc.data().expiresAt.toDate();
            
            if (expiresAt > new Date()) {
                // Session valid, redirect ke dashboard
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // Session expired
                clearSession();
            }
        } else {
            clearSession();
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function clearSession() {
    const sessionId = localStorage.getItem('digiflazz_session');
    if (sessionId) {
        db.collection('sessions').doc(sessionId).update({ active: false });
    }
    localStorage.removeItem('digiflazz_session');
    localStorage.removeItem('digiflazz_user');
}

function logout() {
    clearSession();
    window.location.href = 'index.html';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function hashString(str) {
    // Simple hash untuk demo (production gunakan bcrypt/scrypt)
    const encoder = new TextEncoder();
    const data = encoder.encode(str + 'digiflazz_secret_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
