// ============================================
// DASHBOARD SYSTEM
// ============================================

let currentUser = null;
let currentSaldo = 0;
let selectedProduct = null;

// Inisialisasi dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await verifySession();
    await initProducts();
    setupRealtimeSaldo();
    loadHistory();
});

// ============================================
// VERIFIKASI SESSION - KEAMANAN
// ============================================
async function verifySession() {
    const sessionId = localStorage.getItem('digiflazz_session');
    const username = localStorage.getItem('digiflazz_user');
    
    if (!sessionId || !username) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        
        if (!sessionDoc.exists || !sessionDoc.data().active) {
            logout();
            return;
        }
        
        const expiresAt = sessionDoc.data().expiresAt.toDate();
        if (expiresAt < new Date()) {
            logout();
            return;
        }
        
        // Session valid, load user data
        currentUser = username;
        document.getElementById('welcomeUser').textContent = `Selamat datang, ${username}`;
        
    } catch (error) {
        console.error('Session verification error:', error);
        logout();
    }
}

// ============================================
// LOAD PRODUK DARI FIRESTORE
// ============================================
async function initProducts() {
    const select = document.getElementById('productSelect');
    
    try {
        // Cek apakah produk sudah ada di database
        const productsSnapshot = await db.collection('products').get();
        
        if (productsSnapshot.empty) {
            // Jika belum ada, tambahkan produk default (Smartfren 5000)
            await addDefaultProduct();
            // Reload
            return initProducts();
        }
        
        // Populate select options
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${product.sku} - ${product.name} (Rp ${formatRupiah(product.price)})`;
            option.dataset.sku = product.sku;
            option.dataset.name = product.name;
            option.dataset.price = product.price;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Tambah produk default jika belum ada
async function addDefaultProduct() {
    await db.collection('products').doc('smartfren_5k').set({
        sku: 'SM5',
        name: 'Smartfren 5.000',
        price: 6000,
        category: 'pulsa',
        provider: 'Smartfren',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Default product added');
}

// Update info produk yang dipilih
function updateProductInfo() {
    const select = document.getElementById('productSelect');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption.value) {
        document.getElementById('productInfo').classList.add('hidden');
        selectedProduct = null;
        return;
    }
    
    selectedProduct = {
        id: selectedOption.value,
        sku: selectedOption.dataset.sku,
        name: selectedOption.dataset.name,
        price: parseInt(selectedOption.dataset.price)
    };
    
    document.getElementById('infoSku').textContent = selectedProduct.sku;
    document.getElementById('infoName').textContent = selectedProduct.name;
    document.getElementById('infoPrice').textContent = `Rp ${formatRupiah(selectedProduct.price)}`;
    document.getElementById('productInfo').classList.remove('hidden');
}

// ============================================
// SALDO REALTIME
// ============================================
function setupRealtimeSaldo() {
    db.collection('users').doc(currentUser).onSnapshot((doc) => {
        if (doc.exists) {
            currentSaldo = doc.data().saldo || 0;
            document.getElementById('userSaldo').textContent = `Rp ${formatRupiah(currentSaldo)}`;
        }
    });
}

// ============================================
// PEMBELIAN DENGAN PIN
// ============================================
function showPinModal() {
    const number = document.getElementById('targetNumber').value.trim();
    const errorDiv = document.getElementById('purchaseError');
    
    // Validasi
    if (!number || number.length < 10) {
        errorDiv.textContent = 'Nomor HP tidak valid!';
        return;
    }
    
    if (!selectedProduct) {
        errorDiv.textContent = 'Pilih produk terlebih dahulu!';
        return;
    }
    
    if (currentSaldo < selectedProduct.price) {
        errorDiv.textContent = 'Saldo tidak mencukupi!';
        return;
    }
    
    errorDiv.textContent = '';
    document.getElementById('pinModal').classList.remove('hidden');
    document.getElementById('pinInput').value = '';
    document.getElementById('pinInput').focus();
}

function closePinModal() {
    document.getElementById('pinModal').classList.add('hidden');
    document.getElementById('pinError').textContent = '';
}

async function processPurchase() {
    const pin = document.getElementById('pinInput').value;
    const pinError = document.getElementById('pinError');
    const number = document.getElementById('targetNumber').value.trim();
    
    if (pin.length !== 6) {
        pinError.textContent = 'PIN harus 6 digit!';
        return;
    }
    
    showLoading(true);
    
    try {
        // Verifikasi PIN
        const userDoc = await db.collection('users').doc(currentUser).get();
        const userData = userDoc.data();
        const hashedPin = await hashString(pin);
        
        if (userData.pin !== hashedPin) {
            pinError.textContent = 'PIN salah!';
            showLoading(false);
            return;
        }
        
        // Cek saldo lagi (double check)
        if (currentSaldo < selectedProduct.price) {
            pinError.textContent = 'Saldo tidak mencukupi!';
            showLoading(false);
            return;
        }
        
        // Proses pembelian (transaksi)
        const transactionId = 'TRX' + Date.now();
        const newSaldo = currentSaldo - selectedProduct.price;
        
        // Batch write untuk atomic operation
        const batch = db.batch();
        
        // 1. Kurangi saldo user
        const userRef = db.collection('users').doc(currentUser);
        batch.update(userRef, {
            saldo: newSaldo,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 2. Catat transaksi
        const trxRef = db.collection('transactions').doc(transactionId);
        batch.set(trxRef, {
            transactionId: transactionId,
            username: currentUser,
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            productName: selectedProduct.name,
            price: selectedProduct.price,
            targetNumber: number,
            status: 'success',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        
        // Success
        closePinModal();
        showLoading(false);
        
        // Reset form
        document.getElementById('targetNumber').value = '';
        document.getElementById('productSelect').selectedIndex = 0;
        document.getElementById('productInfo').classList.add('hidden');
        selectedProduct = null;
        
        alert(`✅ Pembelian berhasil!\n\nProduk: ${selectedProduct?.name || 'Produk'}\nNomor: ${number}\nHarga: Rp ${formatRupiah(selectedProduct?.price || 0)}`);
        
        // Refresh history
        loadHistory();
        
    } catch (error) {
        console.error('Purchase error:', error);
        pinError.textContent = 'Terjadi kesalahan. Coba lagi.';
        showLoading(false);
    }
}

// ============================================
// RIWAYAT PEMBELIAN
// ============================================
async function loadHistory() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Memuat...</td></tr>';
    
    try {
        const snapshot = await db.collection('transactions')
            .where('username', '==', currentUser)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Belum ada transaksi</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const trx = doc.data();
            const date = trx.createdAt ? trx.createdAt.toDate().toLocaleString('id-ID') : '-';
            
            const row = `
                <tr>
                    <td>${date}</td>
                    <td>${trx.productName}</td>
                    <td>${trx.targetNumber}</td>
                    <td>Rp ${formatRupiah(trx.price)}</td>
                    <td><span class="status-badge status-success">Sukses</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('History error:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Gagal memuat data</td></tr>';
    }
}

function showHistory() {
    document.getElementById('historySection').classList.toggle('hidden');
    loadHistory();
}

// ============================================
// UTILITY
// ============================================
function formatRupiah(angka) {
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str + 'digiflazz_secret_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function logout() {
    const sessionId = localStorage.getItem('digiflazz_session');
    if (sessionId) {
        db.collection('sessions').doc(sessionId).update({ active: false });
    }
    localStorage.removeItem('digiflazz_session');
    localStorage.removeItem('digiflazz_user');
    window.location.href = 'index.html';
}

// Close modal dengan ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePinModal();
    }
});
