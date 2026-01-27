import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIG FIREBASE (PASTE DISINI)
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

// 2. TAMPILKAN DATA TABEL (REALTIME)
const menuRef = collection(db, "menu");
const q = query(menuRef, orderBy("nama", "asc")); // Urutkan sesuai abjad

onSnapshot(q, (snapshot) => {
    const tabel = document.getElementById('tabel-menu');
    tabel.innerHTML = '';

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // Cek Status Stok untuk warna tombol
        const statusBadge = data.stok ? 
            `<span class="badge bg-success">Tersedia</span>` : 
            `<span class="badge bg-secondary">Habis</span>`;
        
        const btnStokClass = data.stok ? "btn-outline-secondary" : "btn-outline-success";
        const btnStokText = data.stok ? "Set Habis" : "Set Ada";

        const html = `
            <tr>
                <td><img src="${data.gambar}" class="img-preview" onerror="this.src='https://placehold.co/50'"></td>
                <td>
                    <div class="fw-bold text-dark">${data.nama}</div>
                    <small class="text-muted text-capitalize">${data.kategori}</small>
                </td>
                <td>Rp ${parseInt(data.harga).toLocaleString('id-ID')}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button onclick="ubahStok('${id}', ${data.stok})" class="btn ${btnStokClass}" title="Ubah Stok">
                            ${btnStokText}
                        </button>
                        <button onclick="hapusMenu('${id}', '${data.nama}')" class="btn btn-danger" title="Hapus Menu">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tabel.innerHTML += html;
    });

    // Expose fungsi ke window
    window.hapusMenu = hapusMenu;
    window.ubahStok = ubahStok;
});

// 3. FUNGSI TAMBAH MENU BARU
document.getElementById('form-menu').addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah reload halaman

    const nama = document.getElementById('nama').value;
    const harga = document.getElementById('harga').value;
    const kategori = document.getElementById('kategori').value;
    const gambar = document.getElementById('gambar').value;

    try {
        await addDoc(collection(db, "menu"), {
            nama: nama,
            harga: parseInt(harga), // Pastikan jadi angka
            kategori: kategori,
            gambar: gambar,
            stok: true // Default menu baru pasti ada stoknya
        });

        Swal.fire('Berhasil!', 'Menu baru telah ditambahkan.', 'success');
        document.getElementById('form-menu').reset(); // Kosongkan form

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    }
});

// 4. FUNGSI HAPUS MENU
async function hapusMenu(id, namaMenu) {
    Swal.fire({
        title: `Hapus ${namaMenu}?`,
        text: "Data akan hilang permanen!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "menu", id));
            Swal.fire('Terhapus!', 'Menu telah dihapus.', 'success');
        }
    });
}

// 5. FUNGSI UBAH STATUS STOK (TOGGLE)
async function ubahStok(id, statusSaatIni) {
    // Kalau sekarang true, jadi false. Kalau false, jadi true.
    const statusBaru = !statusSaatIni; 
    
    try {
        await updateDoc(doc(db, "menu", id), {
            stok: statusBaru
        });
        // Tidak perlu alert, karena onSnapshot otomatis update tampilan
    } catch (error) {
        console.error(error);
    }
}