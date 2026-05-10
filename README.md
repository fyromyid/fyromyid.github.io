# ⚡ Digiflazz Store

Aplikasi pembelian pulsa dan paket data berbasis web dengan integrasi Digiflazz API. Dibangun dengan HTML, CSS, JavaScript vanilla, dan Firebase Firestore sebagai database.

## 🚀 Fitur

- ✅ **Login & Session** - Autentikasi dengan username/password, session encrypted di localStorage
- ✅ **Keamanan PIN** - PIN 6 digit untuk checkout (disimpan di Firestore)
- ✅ **Manajemen Saldo** - Saldo user tersimpan di Firestore, bisa ditambahkan manual
- ✅ **Produk Dinamis** - Produk diambil dari Firestore (select options)
- ✅ **Riwayat Transaksi** - Semua transaksi tersimpan di Firestore
- ✅ **Cookie Session** - Session management dengan localStorage + encryption
- ✅ **Tambah User Manual** - User ditambahkan langsung di database Firestore

## 📁 Struktur File

```
digiflazz-app/
├── index.html          # Halaman Login
├── dashboard.html      # Halaman Dashboard
├── css/
│   └── style.css      # Styling
├── js/
│   ├── firebase-config.js  # Konfigurasi Firebase + Init Data
│   ├── auth.js            # Autentikasi & Session
│   └── app.js             # Logika Aplikasi
└── README.md
```

## 🔧 Setup Firebase

### 1. Buat Project Firebase
1. Kunjungi [Firebase Console](https://console.firebase.google.com)
2. Buat project baru
3. Aktifkan **Firestore Database**
4. Atur security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Hanya untuk development!
    }
  }
}
```

### 2. Dapatkan Konfigurasi
1. Project Settings > General > Your apps
2. Klik icon web (</>)
3. Copy konfigurasi ke `js/firebase-config.js`

### 3. Inisialisasi Data
Buka aplikasi di browser, buka **Console (F12)**, jalankan:
```javascript
initializeDefaultData();
```

Ini akan membuat:
- User: `hasanhusen` / `Hasanbaik123@` (PIN: `123456`)
- Produk default (Smartfren, Telkomsel, dll)

## 👤 User Default

| Field | Value |
|-------|-------|
| Username | `hasanhusen` |
| Password | `Hasanbaik123@` |
| PIN | `123456` |
| Saldo Awal | Rp 100.000 |
| Role | admin |

## 📦 Produk Default

| SKU | Nama | Harga |
|-----|------|-------|
| SM5 | Smartfren 5.000 | Rp 6.000 |
| SM10 | Smartfren 10.000 | Rp 11.000 |
| SM20 | Smartfren 20.000 | Rp 21.000 |
| TR5 | Telkomsel 5.000 | Rp 6.000 |
| TR10 | Telkomsel 10.000 | Rp 11.000 |

## 🔐 Keamanan

1. **Session Encryption** - Data session dienkripsi dengan base64
2. **PIN Verification** - PIN wajib untuk setiap checkout
3. **Session Timeout** - Session berlaku 24 jam
4. **Cookie-like Storage** - Menggunakan localStorage sebagai pengganti cookie

## 📝 Menambah User Baru

Tambahkan dokumen baru di collection `users` di Firestore:

```json
{
  "username": "userbaru",
  "password": "Password123@",
  "pin": "654321",
  "saldo": 50000,
  "role": "user",
  "createdAt": "timestamp"
}
```

## 💰 Menambah Saldo

Update field `saldo` di dokumen user di Firestore Console.

## 🌐 Deploy ke GitHub Pages

1. Buat repository baru di GitHub
2. Upload semua file
3. Settings > Pages > Source: Deploy from a branch
4. Pilih branch `main` dan folder `/ (root)`
5. Akses via `https://username.github.io/digiflazz-app`

## ⚠️ Catatan Keamanan

**Untuk production:**
- Gunakan Firebase Auth (bukan plaintext password)
- Hash password dengan bcrypt/argon2
- Gunakan HTTPS wajib
- Restrict Firestore rules
- Tambahkan rate limiting
- Validasi input server-side

## 📄 Lisensi

MIT License - Free to use and modify.
