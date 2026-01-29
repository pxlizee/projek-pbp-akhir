import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. CONFIG FIREBASE
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

// VARIABEL GLOBAL PENTING
let idMenuYangDiedit = null; // Menyimpan ID menu yang sedang diedit
let dataMenuCache = {};      // Menyimpan data menu biar gampang diambil

// Expose fungsi ke window
window.hapusMenu = hapusMenu;
window.ubahStok = ubahStok;
window.modeEdit = modeEdit;
window.batalEdit = batalEdit;

// 2. TAMPILKAN DATA TABEL (REALTIME)
const menuRef = collection(db, "menu");
const q = query(menuRef, orderBy("nama", "asc"));

onSnapshot(q, (snapshot) => {
    const tabel = document.getElementById('tabel-menu');
    tabel.innerHTML = '';
    dataMenuCache = {}; // Reset cache

    if (snapshot.empty) {
        tabel.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada menu</td></tr>';
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        // Simpan data ke memori biar tombol Edit gampang ambilnya
        dataMenuCache[id] = data;

        // Cek nama aman (untuk alert hapus)
        const safeNama = data.nama.replace(/'/g, "\\'");

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
                        <button onclick="window.modeEdit('${id}')" class="btn btn-warning text-white" title="Edit Menu">
                            ✏️
                        </button>
                        
                        <button onclick="window.ubahStok('${id}', ${data.stok})" class="btn ${btnStokClass}" title="Ubah Stok">
                            ${btnStokText}
                        </button>
                        
                        <button onclick="window.hapusMenu('${id}', '${safeNama}')" class="btn btn-danger" title="Hapus Menu">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tabel.innerHTML += html;
    });
});

// 3. FUNGSI UNTUK MENGAKTIFKAN MODE EDIT
function modeEdit(id) {
    const data = dataMenuCache[id]; // Ambil data dari memori
    if (!data) return;

    // Isi formulir dengan data lama
    document.getElementById('nama').value = data.nama;
    document.getElementById('harga').value = data.harga;
    document.getElementById('kategori').value = data.kategori;
    document.getElementById('gambar').value = data.gambar;

    // Ubah Tampilan Form jadi Mode Edit
    idMenuYangDiedit = id; // Set global variable
    
    document.getElementById('form-title').innerText = "Edit Menu: " + data.nama;
    document.getElementById('form-title').className = "fw-bold mb-3 text-warning";
    
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "Update Data Menu";
    btnSubmit.classList.remove('btn-primary');
    btnSubmit.classList.add('btn-warning');

    // Munculkan tombol Batal
    document.getElementById('btn-batal').classList.remove('d-none');
    
    // Scroll ke atas (biar kelihatan di HP)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 4. FUNGSI BATAL EDIT (RESET FORM)
function batalEdit() {
    document.getElementById('form-menu').reset();
    idMenuYangDiedit = null; // Reset ID

    // Kembalikan Tampilan ke Mode Tambah
    document.getElementById('form-title').innerText = "Tambah Menu Baru";
    document.getElementById('form-title').className = "fw-bold mb-3 text-dark";

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "Simpan ke Database";
    btnSubmit.classList.remove('btn-warning');
    btnSubmit.classList.add('btn-primary');

    // Sembunyikan tombol Batal
    document.getElementById('btn-batal').classList.add('d-none');
}

// 5. FUNGSI SUBMIT (BISA SIMPAN BARU ATAU UPDATE)
document.getElementById('form-menu').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nama = document.getElementById('nama').value;
    const harga = document.getElementById('harga').value;
    const kategori = document.getElementById('kategori').value;
    const gambar = document.getElementById('gambar').value;

    try {
        if (idMenuYangDiedit) {
            // === LOGIKA UPDATE (EDIT) ===
            await updateDoc(doc(db, "menu", idMenuYangDiedit), {
                nama: nama,
                harga: parseInt(harga),
                kategori: kategori,
                gambar: gambar
                // Stok tidak diupdate disini biar ga kereset
            });
            Swal.fire('Updated!', 'Data menu berhasil diperbarui.', 'success');
            batalEdit(); // Reset form setelah sukses
            
        } else {
            // === LOGIKA TAMBAH BARU ===
            await addDoc(collection(db, "menu"), {
                nama: nama,
                harga: parseInt(harga),
                kategori: kategori,
                gambar: gambar,
                stok: true
            });
            Swal.fire('Berhasil!', 'Menu baru ditambahkan.', 'success');
            document.getElementById('form-menu').reset();
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', error.message, 'error');
    }
});

// 6. FUNGSI HAPUS (SAMA KAYA KEMARIN)
async function hapusMenu(id, namaMenu) {
    Swal.fire({
        title: `Hapus ${namaMenu}?`,
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Jika menu yang lagi diedit malah dihapus, reset formnya
            if (idMenuYangDiedit === id) batalEdit(); 
            
            await deleteDoc(doc(db, "menu", id));
            Swal.fire('Terhapus!', 'Menu telah dihapus.', 'success');
        }
    });
}

// 7. FUNGSI STOK (SAMA KAYA KEMARIN)
async function ubahStok(id, statusSaatIni) {
    try {
        await updateDoc(doc(db, "menu", id), { stok: !statusSaatIni });
    } catch (error) {
        console.error(error);
    }
}