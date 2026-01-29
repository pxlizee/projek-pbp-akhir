import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. KONFIGURASI FIREBASE
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

// 2. FUNGSI LIVE MONITORING
const pesananRef = collection(db, "pesanan");
const q = query(pesananRef, orderBy("waktu_pesan", "desc"));

onSnapshot(q, (snapshot) => {
    const container = document.getElementById('list-pesanan');
    container.innerHTML = ''; 

    if (snapshot.empty) {
        container.innerHTML = '<div class="col-12 text-center text-muted">Belum ada pesanan aktif</div>';
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;
        
        // Format Items
        let listMakanan = '';
        data.items.forEach(item => {
            listMakanan += `<li>${item.nama} (${item.qty}x)</li>`;
        });

        const badgeColor = data.status === 'Selesai' ? 'bg-success' : 'bg-warning text-dark';
        const borderClass = data.status === 'Selesai' ? 'selesai' : '';

        // --- BAGIAN PENTING: LOGIKA CATATAN ---
        // Kita cek: Jika ada data catatan DAN isinya bukan strip (-), baru munculkan
        let htmlCatatan = '';
        if (data.catatan && data.catatan !== "-") {
            htmlCatatan = `<div class="alert alert-warning py-2 px-2 small mb-3 border-0 shadow-sm">
                                📝 <b>Note:</b> ${data.catatan}
                           </div>`;
        }
        // --------------------------------------

        const html = `
        <div class="col-md-6 col-lg-4">
            <div class="card shadow-sm card-order ${borderClass} mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="fw-bold">Meja ${data.nomor_meja}</h5>
                        <span class="badge ${badgeColor}">${data.status}</span>
                    </div>
                    <h6 class="text-muted small mb-3">Pemesan: ${data.nama_pemesan}</h6>
                    
                    <ul class="small bg-light p-2 rounded mb-2" style="list-style-position: inside;">
                        ${listMakanan}
                    </ul>

                    ${htmlCatatan}
                    
                    <div class="d-flex justify-content-between align-items-center fw-bold text-danger mb-3">
                        <span>Total:</span>
                        <span>Rp ${data.total_bayar.toLocaleString('id-ID')}</span>
                    </div>

                    <div class="d-grid gap-2 d-flex">
                        ${data.status !== 'Selesai' ? 
                            `<button onclick="updateStatus('${id}')" class="btn btn-success btn-sm flex-grow-1">✅ Selesai Masak</button>` 
                            : 
                            `<button class="btn btn-secondary btn-sm flex-grow-1" disabled>Sudah Selesai</button>`
                        }
                        <button onclick="hapusPesanan('${id}')" class="btn btn-outline-danger btn-sm">🗑️ Hapus</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        container.innerHTML += html;
    });

    window.updateStatus = updateStatus;
    window.hapusPesanan = hapusPesanan;
});

// 3. FUNGSI UPDATE STATUS
async function updateStatus(id) {
    try {
        const docRef = doc(db, "pesanan", id);
        await updateDoc(docRef, { status: "Selesai" });
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
        });
        Toast.fire({ icon: 'success', title: 'Status diperbarui!' });
    } catch (e) {
        console.error("Error: ", e);
    }
}

// 4. FUNGSI HAPUS PESANAN
async function hapusPesanan(id) {
    Swal.fire({
        title: 'Hapus pesanan ini?',
        text: "Data tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "pesanan", id));
            Swal.fire('Terhapus!', 'Pesanan telah dihapus.', 'success');
        }
    });
}