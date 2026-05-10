// ============================================
// MAIN APPLICATION - DIGIFLAZZ STORE
// ============================================

class DigiflazzApp {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.produkList = [];
        this.selectedProduk = null;
        this.pinVerified = false;
    }

    async init() {
        // Cek autentikasi
        if (!auth.requireAuth()) return;

        this.currentUser = auth.getSession();

        // Load user data
        await this.loadUserData();

        // Setup UI
        this.setupUI();
        this.setupNavigation();
        this.setupPinModal();
        this.setupForm();

        // Load produk
        await this.loadProduk();

        // Load riwayat
        await this.loadRiwayat();

        // Tampilkan PIN modal saat pertama kali
        if (!auth.isPinVerified()) {
            this.showPinModal();
        }
    }

    // Load data user dari Firestore
    async loadUserData() {
        try {
            const doc = await db.collection('users').doc(this.currentUser.username).get();
            if (doc.exists) {
                this.userData = doc.data();
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('Error loading user:', error);
            this.showToast('Gagal memuat data user', 'error');
        }
    }

    // Update tampilan user
    updateUserDisplay() {
        if (!this.userData) return;

        const saldo = this.userData.saldo || 0;
        const formattedSaldo = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(saldo);

        // Update navbar
        const saldoDisplay = document.getElementById('saldoDisplay');
        const userDisplay = document.getElementById('userDisplay');

        if (saldoDisplay) saldoDisplay.textContent = formattedSaldo;
        if (userDisplay) userDisplay.textContent = this.userData.username;

        // Update profil page
        const profilUsername = document.getElementById('profilUsername');
        const profilSaldo = document.getElementById('profilSaldo');
        const profilRole = document.getElementById('profilRole');

        if (profilUsername) profilUsername.textContent = this.userData.username;
        if (profilSaldo) profilSaldo.textContent = formattedSaldo;
        if (profilRole) profilRole.textContent = this.userData.role || 'user';
    }

    // Setup UI umum
    setupUI() {
        // Update username di navbar
        const userDisplay = document.getElementById('userDisplay');
        if (userDisplay && this.currentUser) {
            userDisplay.textContent = this.currentUser.username;
        }
    }

    // Setup navigasi sidebar
    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        const pages = document.querySelectorAll('.page');

        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Update active menu
                menuItems.forEach(m => m.classList.remove('active'));
                item.classList.add('active');

                // Show page
                const pageName = item.dataset.page;
                pages.forEach(page => page.classList.remove('active'));

                const targetPage = document.getElementById(`page${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`);
                if (targetPage) {
                    targetPage.classList.add('active');
                }

                // Refresh data jika perlu
                if (pageName === 'riwayat') {
                    this.loadRiwayat();
                }
            });
        });
    }

    // Setup PIN Modal
    setupPinModal() {
        const modal = document.getElementById('pinModal');
        const inputs = document.querySelectorAll('.pin-digit');
        const verifyBtn = document.getElementById('verifyPinBtn');
        const pinError = document.getElementById('pinError');

        // Auto-focus dan navigasi input PIN
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1) {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            // Hanya angka
            input.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });

        // Verifikasi PIN
        verifyBtn.addEventListener('click', async () => {
            const pin = Array.from(inputs).map(i => i.value).join('');

            if (pin.length !== 6) {
                pinError.textContent = 'PIN harus 6 digit!';
                pinError.classList.remove('hidden');
                return;
            }

            try {
                const userDoc = await db.collection('users').doc(this.currentUser.username).get();
                const userData = userDoc.data();

                if (userData.pin === pin) {
                    auth.setPinVerified();
                    modal.classList.remove('show');
                    this.showToast('PIN verifikasi berhasil!', 'success');
                } else {
                    pinError.textContent = 'PIN salah!';
                    pinError.classList.remove('hidden');
                    inputs.forEach(i => i.value = '');
                    inputs[0].focus();
                }
            } catch (error) {
                pinError.textContent = 'Terjadi kesalahan!';
                pinError.classList.remove('hidden');
            }
        });
    }

    showPinModal() {
        const modal = document.getElementById('pinModal');
        if (modal) {
            modal.classList.add('show');
            const firstInput = document.querySelector('.pin-digit[data-index="0"]');
            if (firstInput) firstInput.focus();
        }
    }

    // Load produk dari Firestore
    async loadProduk() {
        try {
            const snapshot = await db.collection('produk')
                .where('status', '==', 'aktif')
                .orderBy('harga')
                .get();

            this.produkList = [];
            const select = document.getElementById('produkSelect');

            // Clear options except first
            while (select.options.length > 1) {
                select.remove(1);
            }

            snapshot.forEach(doc => {
                const produk = doc.data();
                this.produkList.push(produk);

                const option = document.createElement('option');
                option.value = produk.sku;
                option.textContent = `${produk.nama} - Rp ${produk.harga.toLocaleString('id-ID')}`;
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading produk:', error);
            this.showToast('Gagal memuat produk', 'error');
        }
    }

    // Setup form pembelian
    setupForm() {
        const select = document.getElementById('produkSelect');
        const form = document.getElementById('beliForm');

        // Update info saat produk dipilih
        select.addEventListener('change', () => {
            const sku = select.value;
            this.selectedProduk = this.produkList.find(p => p.sku === sku);

            if (this.selectedProduk) {
                document.getElementById('infoSku').textContent = this.selectedProduk.sku;
                document.getElementById('infoNama').textContent = this.selectedProduk.nama;
                document.getElementById('infoHarga').textContent = 
                    `Rp ${this.selectedProduk.harga.toLocaleString('id-ID')}`;
            } else {
                document.getElementById('infoSku').textContent = '-';
                document.getElementById('infoNama').textContent = '-';
                document.getElementById('infoHarga').textContent = 'Rp 0';
            }
        });

        // Handle submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCheckout();
        });
    }

    // Proses checkout
    async handleCheckout() {
        // Cek PIN verified
        if (!auth.isPinVerified()) {
            this.showPinModal();
            return;
        }

        const nomorTujuan = document.getElementById('nomorTujuan').value.trim();

        if (!this.selectedProduk) {
            this.showToast('Pilih produk terlebih dahulu!', 'error');
            return;
        }

        if (!nomorTujuan || nomorTujuan.length < 10) {
            this.showToast('Nomor tujuan tidak valid!', 'error');
            return;
        }

        // Cek saldo
        const harga = this.selectedProduk.harga;
        const saldo = this.userData.saldo || 0;

        if (saldo < harga) {
            this.showToast('Saldo tidak mencukupi!', 'error');
            return;
        }

        // Konfirmasi
        if (!confirm(`Konfirmasi pembelian:

Produk: ${this.selectedProduk.nama}
Nomor: ${nomorTujuan}
Harga: Rp ${harga.toLocaleString('id-ID')}

Lanjutkan?`)) {
            return;
        }

        try {
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            // Buat transaksi
            const transaksiRef = db.collection('transaksi').doc();
            await transaksiRef.set({
                id: transaksiRef.id,
                username: this.currentUser.username,
                sku: this.selectedProduk.sku,
                namaProduk: this.selectedProduk.nama,
                harga: harga,
                nomorTujuan: nomorTujuan,
                status: 'sukses',
                createdAt: timestamp
            });

            // Update saldo user
            const newSaldo = saldo - harga;
            await db.collection('users').doc(this.currentUser.username).update({
                saldo: newSaldo
            });

            // Update local data
            this.userData.saldo = newSaldo;
            this.updateUserDisplay();

            // Reset form
            document.getElementById('beliForm').reset();
            document.getElementById('infoSku').textContent = '-';
            document.getElementById('infoNama').textContent = '-';
            document.getElementById('infoHarga').textContent = 'Rp 0';
            this.selectedProduk = null;

            // Refresh riwayat
            await this.loadRiwayat();

            this.showToast('Pembelian berhasil! 🎉', 'success');

        } catch (error) {
            console.error('Checkout error:', error);
            this.showToast('Gagal melakukan pembelian!', 'error');
        }
    }

    // Load riwayat transaksi
    async loadRiwayat() {
        try {
            const snapshot = await db.collection('transaksi')
                .where('username', '==', this.currentUser.username)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            const tbody = document.getElementById('riwayatTable');

            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Belum ada transaksi</td></tr>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const t = doc.data();
                const date = t.createdAt ? t.createdAt.toDate().toLocaleString('id-ID') : '-';

                html += `
                    <tr>
                        <td>${date}</td>
                        <td>${t.namaProduk}</td>
                        <td>${t.nomorTujuan}</td>
                        <td>Rp ${t.harga.toLocaleString('id-ID')}</td>
                        <td><span class="status-badge status-success">${t.status}</span></td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

        } catch (error) {
            console.error('Error loading riwayat:', error);
        }
    }

    // Toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');

        toastIcon.textContent = type === 'success' ? '✅' : '❌';
        toastMessage.textContent = message;

        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Only init on dashboard
    if (document.getElementById('pageBeli')) {
        const app = new DigiflazzApp();
        app.init();
        window.app = app;
    }
});
