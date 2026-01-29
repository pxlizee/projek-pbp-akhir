import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// 1. TAMBAH IMPORT AUTH
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. CONFIG FIREBASE
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
const auth = getAuth(app); // <--- INISIALISASI AUTH

// ============================================================
// 3. PASANG SATPAM (PENCEGAH PENYUSUP)
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Kalau belum login, tendang ke login.html
        window.location.href = "login.html";
    }
});
// ============================================================

// VARIABEL GLOBAL PENTING
let idMenuYangDiedit = null; 
let dataMenuCache = {};      

// Expose fungsi ke window
window.hapusMenu = hapusMenu;
window.ubahStok = ubahStok;
window.modeEdit = modeEdit;
window.batalEdit = batalEdit;

// TAMPILKAN DATA TABEL (REALTIME)
const menuRef = collection(db, "menu");
const q = query(menuRef, orderBy("nama", "asc"));

onSnapshot(q, (snapshot) => {
    const tabel = document.getElementById('tabel-menu');
    tabel.innerHTML = '';
    dataMenuCache = {}; 

    if (snapshot.empty) {
        tabel.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada menu</td></tr>';
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        dataMenuCache[id] = data;
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
                        <button onclick="window.modeEdit('${id}')" class="btn btn-warning text-white" title="Edit Menu">✏️</button>
                        <button onclick="window.ubahStok('${id}', ${data.stok})" class="btn ${btnStokClass}" title="Ubah Stok">${btnStokText}</button>
                        <button onclick="window.hapusMenu('${id}', '${safeNama}')" class="btn btn-danger" title="Hapus Menu">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
        tabel.innerHTML += html;
    });
});

// FUNGSI MODE EDIT
function modeEdit(id) {
    const data = dataMenuCache[id];
    if (!data) return;

    document.getElementById('nama').value = data.nama;
    document.getElementById('harga').value = data.harga;
    document.getElementById('kategori').value = data.kategori;
    document.getElementById('gambar').value = data.gambar;

    idMenuYangDiedit = id;
    
    document.getElementById('form-title').innerText = "Edit Menu: " + data.nama;
    document.getElementById('form-title').className = "fw-bold mb-3 text-warning";
    
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "Update Data Menu";
    btnSubmit.classList.remove('btn-primary');
    btnSubmit.classList.add('btn-warning');

    document.getElementById('btn-batal').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// FUNGSI BATAL EDIT
function batalEdit() {
    document.getElementById('form-menu').reset();
    idMenuYangDiedit = null; 

    document.getElementById('form-title').innerText = "Tambah Menu Baru";
    document.getElementById('form-title').className = "fw-bold mb-3 text-dark";

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.innerText = "Simpan ke Database";
    btnSubmit.classList.remove('btn-warning');
    btnSubmit.classList.add('btn-primary');

    document.getElementById('btn-batal').classList.add('d-none');
}

// FUNGSI SUBMIT (SIMPAN/UPDATE)
document.getElementById('form-menu').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = document.getElementById('nama').value;
    const harga = document.getElementById('harga').value;
    const kategori = document.getElementById('kategori').value;
    const gambar = document.getElementById('gambar').value;

    try {
        if (idMenuYangDiedit) {
            await updateDoc(doc(db, "menu", idMenuYangDiedit), {
                nama: nama, harga: parseInt(harga), kategori: kategori, gambar: gambar
            });
            Swal.fire('Updated!', 'Data berhasil diperbarui.', 'success');
            batalEdit();
        } else {
            await addDoc(collection(db, "menu"), {
                nama: nama, harga: parseInt(harga), kategori: kategori, gambar: gambar, stok: true
            });
            Swal.fire('Berhasil!', 'Menu ditambahkan.', 'success');
            document.getElementById('form-menu').reset();
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', error.message, 'error');
    }
});

// FUNGSI HAPUS
async function hapusMenu(id, namaMenu) {
    Swal.fire({
        title: `Hapus ${namaMenu}?`,
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus'
    }).then(async (result) => {
        if (result.isConfirmed) {
            if (idMenuYangDiedit === id) batalEdit(); 
            await deleteDoc(doc(db, "menu", id));
            Swal.fire('Terhapus!', 'Menu telah dihapus.', 'success');
        }
    });
}

// FUNGSI UBAH STOK
async function ubahStok(id, statusSaatIni) {
    try {
        await updateDoc(doc(db, "menu", id), { stok: !statusSaatIni });
    } catch (error) {
        console.error(error);
    }
}