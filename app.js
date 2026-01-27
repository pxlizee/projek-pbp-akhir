// ==========================================================
// FIREBASE CONFIGURATION
// ==========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    serverTimestamp,
    onSnapshot,
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA0rRKR7gTqgEysikcKV9YhairiPyZH-JM",
    authDomain: "projek-pbp-akhir.firebaseapp.com",
    projectId: "projek-pbp-akhir",
    storageBucket: "projek-pbp-akhir.firebasestorage.app",
    messagingSenderId: "445157604525",
    appId: "1:445157604525:web:7df2cef53b56db3e15da24",
    measurementId: "G-M5L8NLDE2R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================================
// STATE & INITIALIZATION
// ==========================================================
let keranjang = [];

document.addEventListener('DOMContentLoaded', loadMenu);

// ==========================================================
// MENU FUNCTIONS
// ==========================================================
async function loadMenu() {
    const menuContainer = document.getElementById('daftar-menu');
    menuContainer.innerHTML = '<div class="col-12 text-center">Loading menu...</div>';

    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        menuContainer.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const imageHTML = data.gambar && data.gambar.length > 5
                ? `<img src="${data.gambar}" class="w-100 h-100" style="object-fit:cover">`
                : `<span class="text-muted">No Image</span>`;

            const html = `
                <div class="col-6 col-md-4">
                    <div class="card card-menu h-100 shadow-sm">
                        <div class="card-img-top d-flex align-items-center justify-content-center bg-light overflow-hidden">
                            ${imageHTML}
                        </div>
                        <div class="card-body p-3">
                            <h6 class="card-title fw-bold mb-1 text-dark">${data.nama}</h6>
                            <p class="card-text text-danger fw-bold mb-3">Rp ${data.harga.toLocaleString('id-ID')}</p>
                            <button class="btn btn-sm btn-outline-danger w-100 btn-tambah rounded-pill" 
                                data-nama="${data.nama}" 
                                data-harga="${data.harga}">
                                + Tambah
                            </button>
                        </div>
                    </div>
                </div>
            `;
            menuContainer.innerHTML += html;
        });

        attachButtonListeners();
    } catch (error) {
        console.error("Error loading menu:", error);
        menuContainer.innerHTML = `<div class="text-danger text-center">Gagal memuat menu: ${error.message}</div>`;
    }
}

function attachButtonListeners() {
    document.querySelectorAll('.btn-tambah').forEach(btn => {
        btn.addEventListener('click', function() {
            tambahKeKeranjang(this.dataset.nama, parseInt(this.dataset.harga));
        });
    });
}

// ==========================================================
// CART FUNCTIONS
// ==========================================================
function tambahKeKeranjang(nama, harga) {
    const itemAda = keranjang.find(item => item.nama === nama);
    
    if (itemAda) {
        itemAda.qty += 1;
    } else {
        keranjang.push({ nama, harga, qty: 1 });
    }

    updateTampilanKeranjang();
}

function hapusItem(index) {
    keranjang.splice(index, 1);
    updateTampilanKeranjang();
}

function updateTampilanKeranjang() {
    const listKeranjang = document.getElementById('list-keranjang');
    const textTotal = document.getElementById('text-total');
    const btnPesan = document.getElementById('btn-pesan');

    listKeranjang.innerHTML = '';
    let totalBayar = 0;

    if (keranjang.length === 0) {
        listKeranjang.innerHTML = '<li class="list-group-item text-center small text-muted">Belum ada item</li>';
        btnPesan.disabled = true;
    } else {
        keranjang.forEach((item, index) => {
            const subtotal = item.harga * item.qty;
            totalBayar += subtotal;

            listKeranjang.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center p-2">
                    <div class="small">
                        <div class="fw-bold">${item.nama}</div>
                        <div class="text-muted">${item.qty} x Rp ${item.harga.toLocaleString('id-ID')}</div>
                    </div>
                    <span class="badge bg-secondary rounded-pill" style="cursor:pointer" onclick="hapusItem(${index})">X</span>
                </li>
            `;
        });
        btnPesan.disabled = false;
    }

    textTotal.innerText = `Rp ${totalBayar.toLocaleString('id-ID')}`;
    window.hapusItem = hapusItem;
    window.kirimPesanan = kirimPesanan;
}

// ==========================================================
// CHECKOUT FUNCTIONS
// ==========================================================
async function kirimPesanan() {
    const nama = document.getElementById('input-nama').value;
    const meja = document.getElementById('input-meja').value;
    const catatan = document.getElementById('input-catatan').value;
    
    // VALIDASI INPUT KOSONG
    if (!nama || !meja) {
        Swal.fire({
            icon: 'warning',
            title: 'Ups!',
            text: 'Nama dan Nomor Meja harus diisi dulu ya.',
            confirmButtonColor: '#d33'
        });
        return;
    }

    const btnPesan = document.getElementById('btn-pesan');
    
    // --- FITUR PENCEGAH SPAM KLIK (CLIENT SIDE) ---
    // Matikan tombol segera setelah diklik agar tidak bisa diklik 2x
    btnPesan.disabled = true; 
    btnPesan.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cek Data...';

    try {
        // --- LANGKAH BARU: CEK DUPLIKASI DI DATABASE (SERVER SIDE) ---
        // "Cari pesanan di meja ini, atas nama ini, yang statusnya belum selesai"
        const q = query(
            collection(db, "pesanan"), 
            where("nama_pemesan", "==", nama),
            where("nomor_meja", "==", meja),
            where("status", "==", "Dipesan") // Hanya blokir kalau statusnya masih "Dipesan"
        );

        const snapshotCek = await getDocs(q);

        // Jika ketemu datanya (artinya sudah pernah pesan dan belum selesai)
        if (!snapshotCek.empty) {
            Swal.fire({
                icon: 'error',
                title: 'Pesanan Masih Aktif!',
                text: 'Anda sudah memiliki pesanan yang sedang diproses. Mohon tunggu sampai selesai.',
                confirmButtonColor: '#d33'
            });
            // Hentikan proses disini, jangan lanjut kirim!
            btnPesan.disabled = false;
            btnPesan.innerHTML = "Pesan Sekarang";
            return; 
        }

        // --- KALAU LOLOS CEK, BARU KITA KIRIM ---
        btnPesan.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengirim...';
        
        const totalBayar = keranjang.reduce((acc, item) => acc + (item.harga * item.qty), 0);

        const docRef = await addDoc(collection(db, "pesanan"), {
            nama_pemesan: nama,
            nomor_meja: meja,
            catatan: catatan,
            items: keranjang,
            total_bayar: totalBayar,
            waktu_pesan: serverTimestamp(),
            status: "Dipesan"
        });

        // SUKSES
        Swal.fire({
            icon: 'success',
            title: 'Pesanan Masuk Dapur!',
            text: 'Mohon jangan tutup halaman ini sampai makanan siap.',
            showConfirmButton: false,
            timer: 2000
        });

        // BERSIHKAN FORM
        keranjang = [];
        document.getElementById('input-nama').value = '';
        document.getElementById('input-meja').value = '';
        document.getElementById('input-catatan').value = '';
        updateTampilanKeranjang();

        // PANTAU STATUS
        pantauPesanan(docRef.id); 

    } catch (e) {
        console.error("Error adding document: ", e);
        Swal.fire({ icon: 'error', title: 'Gagal', text: e.message });
        // Kalau error, nyalakan tombol lagi
        btnPesan.disabled = false;
        btnPesan.innerHTML = "Pesan Sekarang";
    }
}

// ==========================================
// FUNGSI TAMBAHAN: PANTAU STATUS PESANAN
// ==========================================
function pantauPesanan(orderId) {
    const btnPesan = document.getElementById('btn-pesan');
    
    // 1. Ubah tombol jadi mode "Menunggu"
    btnPesan.innerHTML = "⏳ Menunggu Makanan Siap...";
    btnPesan.className = "btn btn-warning w-100 py-2 fw-bold rounded-pill shadow-sm text-dark";
    btnPesan.disabled = true;

    // 2. Pasang "CCTV" (Listener) ke dokumen pesanan tadi
    // Ini akan memantau perubahan data secara real-time
    const unsubscribe = onSnapshot(doc(db, "pesanan", orderId), (docSnap) => {
        const data = docSnap.data();
        
        // 3. Cek apakah status sudah berubah jadi 'Selesai'
        if (data && data.status === "Selesai") {
            
            // 4. MUNCULKAN NOTIFIKASI KE PEMBELI!
            Swal.fire({
                title: 'HORE! MAKANAN SIAP! 🍜',
                text: 'Silakan ambil pesanan Anda di meja kasir/dapur.',
                imageUrl: 'https://media.giphy.com/media/l1AsAMOkYjwteLRDA/giphy.gif',
                imageWidth: 200,
                imageHeight: 200,
                confirmButtonText: 'Oke, Saya Ambil',
                confirmButtonColor: '#198754',
                backdrop: `rgba(0,0,123,0.4)`
            });

            // 5. Kembalikan tombol ke kondisi semula
            btnPesan.innerHTML = "Pesan Sekarang";
            btnPesan.className = "btn btn-danger w-100 py-2 fw-bold rounded-pill shadow-sm";
            btnPesan.disabled = false;

            // 6. Matikan CCTV (Supaya hemat memori setelah selesai)
            unsubscribe();
        }
    });
}