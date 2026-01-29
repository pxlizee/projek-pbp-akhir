import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, onSnapshot, doc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 1. CONFIG FIREBASE
// ==========================================
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

// ==========================================
// 2. STATE MANAGEMENT & EXPOSE WINDOW
// ==========================================
let keranjang = [];
let allMenuData = []; 

// PENTING: Mendaftarkan fungsi agar bisa dipanggil HTML Mobile
window.filterKategori = filterKategori;
window.tambahKeKeranjang = tambahKeKeranjang;
window.ubahQty = ubahQty;
window.kirimPesanan = kirimPesanan;
window.kirimPesananMobile = kirimPesananMobile; // <--- INI KUNCINYA

document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    updateTampilanKeranjang(); // Pastikan tombol reset saat awal load
});

// ==========================================
// 3. LOGIKA LOAD & RENDER MENU (DENGAN ANIMASI)
// ==========================================
async function loadMenu() {
    const menuContainer = document.getElementById('daftar-menu');
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        allMenuData = [];
        
        querySnapshot.forEach((doc) => {
            allMenuData.push({ id: doc.id, ...doc.data() });
        });

        renderMenu('all'); 
    } catch (error) {
        console.error("Error:", error);
        menuContainer.innerHTML = `<div class="col-12 text-center text-danger">Gagal memuat data.</div>`;
    }
}

function renderMenu(kategori) {
    const menuContainer = document.getElementById('daftar-menu');
    menuContainer.innerHTML = '';

    const filteredData = (kategori === 'all') 
        ? allMenuData 
        : allMenuData.filter(item => item.kategori === kategori);

    if (filteredData.length === 0) {
        menuContainer.innerHTML = `<div class="col-12 text-center text-muted py-5">Kategori ini kosong 😔</div>`;
        return;
    }

    // Loop dengan index (i) untuk animasi delay
    filteredData.forEach((data, i) => {
        const isDisabled = !data.stok ? 'disabled' : '';
        const btnLabel = data.stok ? 'Tambah' : 'Habis';
        const grayscale = data.stok ? '' : 'filter: grayscale(100%);';
        const delay = i * 100; // Delay animasi

        const html = `
            <div class="col-6 col-md-4 col-lg-3 menu-item-anim" style="animation-delay: ${delay}ms">
                <div class="card card-menu h-100 shadow-sm" style="${grayscale}">
                    
                    <div class="img-wrap bg-light position-relative">
                        <img src="${data.gambar}" onerror="this.src='https://placehold.co/400?text=No+Image'">
                        ${!data.stok ? '<div class="position-absolute w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center text-white fw-bold">HABIS</div>' : ''}
                    </div>

                    <div class="card-body p-2 d-flex flex-column">
                        <h6 class="card-title fw-bold mb-1 text-dark text-truncate small">${data.nama}</h6>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                             <small class="text-muted text-capitalize" style="font-size:10px">${data.kategori}</small>
                             <span class="text-danger fw-bold small">Rp ${data.harga.toLocaleString('id-ID')}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger w-100 mt-auto rounded-pill" 
                            onclick="tambahKeKeranjang('${data.nama}', ${data.harga})" ${isDisabled}>
                            ${btnLabel}
                        </button>
                    </div>
                </div>
            </div>
        `;
        menuContainer.innerHTML += html;
    });
}

function filterKategori(kategori) {
    document.querySelectorAll('.rounded-pill').forEach(btn => {
        if(btn.id.startsWith('btn-')) { // Hanya tombol filter
            btn.classList.remove('active-filter', 'btn-danger');
            btn.classList.add('btn-outline-danger');
        }
    });
    const btnAktif = document.getElementById('btn-' + kategori);
    if(btnAktif) {
        btnAktif.classList.remove('btn-outline-danger');
        btnAktif.classList.add('active-filter');
    }
    renderMenu(kategori);
}

// ==========================================
// 4. LOGIKA KERANJANG (SINKRONISASI MOBILE & DESKTOP)
// ==========================================
function tambahKeKeranjang(nama, harga) {
    const itemAda = keranjang.find(item => item.nama === nama);
    if (itemAda) {
        itemAda.qty += 1;
    } else {
        keranjang.push({ nama, harga, qty: 1 });
    }
    updateTampilanKeranjang();
    if(navigator.vibrate) navigator.vibrate(50); // Getar dikit di HP
}

function ubahQty(index, change) {
    if (keranjang[index].qty + change <= 0) {
        keranjang.splice(index, 1);
    } else {
        keranjang[index].qty += change;
    }
    updateTampilanKeranjang();
}

function updateTampilanKeranjang() {
    // Target elemen Desktop & Mobile
    const listDesktop = document.getElementById('list-keranjang');
    const listMobile = document.getElementById('list-keranjang-mobile');
    
    // Target Tombol Pesan (PENTING! INI YANG BIKIN ERROR KALAU SALAH ID)
    const btnDesktop = document.getElementById('btn-pesan');
    const btnMobile = document.getElementById('btn-pesan-mobile');
    
    // Reset HTML
    if(listDesktop) listDesktop.innerHTML = '';
    if(listMobile) listMobile.innerHTML = '';

    let totalBayar = 0;
    let totalQty = 0;

    if (keranjang.length === 0) {
        const emptyHtml = '<li class="list-group-item text-center small text-muted border-0">Keranjang kosong</li>';
        if(listDesktop) listDesktop.innerHTML = emptyHtml;
        if(listMobile) listMobile.innerHTML = emptyHtml;
    } else {
        keranjang.forEach((item, index) => {
            totalBayar += (item.harga * item.qty);
            totalQty += item.qty;

            const htmlItem = `
            <li class="list-group-item d-flex justify-content-between align-items-center p-2 bg-transparent">
                <div class="small lh-1">
                    <div class="fw-bold mb-1">${item.nama}</div>
                    <div class="text-muted" style="font-size:11px">Rp ${item.harga.toLocaleString()}</div>
                </div>
                <div class="d-flex align-items-center gap-2 bg-white rounded-pill border px-1 py-1">
                    <button onclick="ubahQty(${index}, -1)" class="btn btn-sm btn-link text-dark p-0 text-decoration-none fw-bold px-2">-</button>
                    <span class="small fw-bold">${item.qty}</span>
                    <button onclick="ubahQty(${index}, 1)" class="btn btn-sm btn-link text-danger p-0 text-decoration-none fw-bold px-2">+</button>
                </div>
            </li>`;
            
            if(listDesktop) listDesktop.innerHTML += htmlItem;
            if(listMobile) listMobile.innerHTML += htmlItem;
        });
    }

    // Update Total Harga Teks
    const strTotal = `Rp ${totalBayar.toLocaleString('id-ID')}`;
    const txtTotalDesk = document.getElementById('text-total');
    const txtTotalMob = document.getElementById('mobile-total');
    
    if(txtTotalDesk) txtTotalDesk.innerText = strTotal;
    if(txtTotalMob) txtTotalMob.innerText = strTotal;
    
    const qtyBadge = document.getElementById('mobile-qty');
    if(qtyBadge) qtyBadge.innerText = totalQty;

    // LOGIKA ENABLE/DISABLE TOMBOL (PERBAIKAN DISINI)
    // Kalau keranjang kosong, tombol disable. Kalau isi, enable.
    const isKosong = (keranjang.length === 0);
    
    if(btnDesktop) btnDesktop.disabled = isKosong;
    if(btnMobile) btnMobile.disabled = isKosong; 
}

// ==========================================
// 5. FUNGSI KHUSUS TOMBOL MOBILE (BRIDGE)
// ==========================================
function kirimPesananMobile() {
    // 1. Copy isi form Mobile ke form Desktop (yang dibaca fungsi utama)
    const namaMob = document.getElementById('input-nama-mobile').value;
    const mejaMob = document.getElementById('input-meja-mobile').value;
    const noteMob = document.getElementById('input-catatan-mobile').value;

    document.getElementById('input-nama').value = namaMob;
    document.getElementById('input-meja').value = mejaMob;
    document.getElementById('input-catatan').value = noteMob;
    
    // 2. Tutup Offcanvas (Biar rapi)
    const offcanvasEl = document.getElementById('keranjangMobile');
    const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if(offcanvas) offcanvas.hide();

    // 3. Panggil fungsi kirim utama
    kirimPesanan();
}

// ==========================================
// 6. LOGIKA KIRIM PESANAN UTAMA
// ==========================================
async function kirimPesanan() {
    const nama = document.getElementById('input-nama').value;
    const meja = document.getElementById('input-meja').value;
    const catatan = document.getElementById('input-catatan').value || "-";

    if (!nama || !meja) {
        Swal.fire('Ups!', 'Nama dan Nomor Meja wajib diisi.', 'warning');
        return;
    }

    // Matikan Tombol (Loading)
    const btns = [document.getElementById('btn-pesan'), document.getElementById('btn-pesan-mobile')];
    btns.forEach(btn => { if(btn) { btn.disabled = true; btn.innerHTML = '⏳ Memproses...'; }});

    try {
        // Cek Duplikasi
        const q = query(collection(db, "pesanan"), 
            where("nama_pemesan", "==", nama), 
            where("nomor_meja", "==", meja),
            where("status", "==", "Dipesan")
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            throw new Error("Pesanan atas nama ini masih aktif di dapur.");
        }

        const totalBayar = keranjang.reduce((acc, item) => acc + (item.harga * item.qty), 0);

        // Kirim ke Firebase
        const docRef = await addDoc(collection(db, "pesanan"), {
            nama_pemesan: nama,
            nomor_meja: meja,
            catatan: catatan,
            items: keranjang,
            total_bayar: totalBayar,
            waktu_pesan: serverTimestamp(),
            status: "Dipesan"
        });

        // Sukses
        Swal.fire({
            icon: 'success',
            title: 'Pesanan Terkirim!',
            text: 'Mohon tunggu makanan siap.',
            showConfirmButton: false,
            timer: 2000
        });

        // Reset Form Mobile & Desktop
        keranjang = [];
        updateTampilanKeranjang();
        ['input-nama', 'input-meja', 'input-catatan', 'input-nama-mobile', 'input-meja-mobile', 'input-catatan-mobile']
            .forEach(id => document.getElementById(id).value = '');

        pantauPesanan(docRef.id);

    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
        // Nyalakan tombol lagi kalau gagal
        btns.forEach(btn => { if(btn) { btn.disabled = false; btn.innerHTML = 'Pesan Sekarang'; }});
    }
}

// 7. PANTAU STATUS
function pantauPesanan(orderId) {
    const btns = [document.getElementById('btn-pesan'), document.getElementById('btn-pesan-mobile')];
    
    btns.forEach(btn => { 
        if(btn) { 
            btn.innerHTML = '⏳ Menunggu Makanan...';
            btn.classList.replace('btn-danger', 'btn-warning');
            btn.disabled = true; 
        }
    });

    const unsubscribe = onSnapshot(doc(db, "pesanan", orderId), (docSnap) => {
        const data = docSnap.data();
        if (data && data.status === "Selesai") {
            Swal.fire({
                title: 'MAKANAN SIAP! 🍜',
                text: 'Silakan ambil pesanan Anda.',
                imageUrl: 'https://media.giphy.com/media/3o7TKR1yT2b2ZqHqda/giphy.gif',
                imageWidth: 200, imageHeight: 200,
                confirmButtonColor: '#198754'
            });

            btns.forEach(btn => { 
                if(btn) { 
                    btn.innerHTML = 'Pesan Sekarang';
                    btn.classList.replace('btn-warning', 'btn-danger');
                    btn.disabled = false; 
                }
            });
            unsubscribe();
        }
    });
}