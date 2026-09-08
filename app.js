let inventaris = JSON.parse(localStorage.getItem("libtrack_inventory")) || [];
let peminjaman = JSON.parse(localStorage.getItem("libtrack_peminjaman")) || [];
let isDarkMode = localStorage.getItem("libtrack_theme") === "dark";
let activeKondisiFilter = "";
let currentPin = "";
const CORRECT_PIN = "1234";

window.addEventListener("DOMContentLoaded", () => {
    if (isDarkMode) {
        document.body.setAttribute("data-theme", "dark");
        updateSettingThemeUI();
    }
    renderData();
    renderPeminjaman();
});

function switchTab(screenId, titleText, element) {
    document.querySelectorAll('.app-screen').forEach(screen => screen.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    document.getElementById(screenId).classList.add('active');
    element.classList.add('active');
    document.getElementById('currentScreenTitle').innerText = titleText;

    if (window.lucide) lucide.createIcons();
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.body.setAttribute("data-theme", "dark");
        localStorage.setItem("libtrack_theme", "dark");
        showToast("Mode Gelap Aktif");
    } else {
        document.body.removeAttribute("data-theme");
        localStorage.setItem("libtrack_theme", "light");
        showToast("Mode Terang Aktif");
    }
    updateSettingThemeUI();
}

function updateSettingThemeUI() {
    const statusText = document.getElementById("themeStatusText");
    if (statusText) statusText.innerText = isDarkMode ? "Aktif" : "Nonaktif";
}

function pressPin(num) {
    if (currentPin.length < 4) {
        currentPin += num;
        updatePinDots();
        if (currentPin.length === 4) setTimeout(checkPin, 150);
    }
}

function deletePin() {
    currentPin = currentPin.slice(0, -1);
    updatePinDots();
}

function clearPin() {
    currentPin = "";
    updatePinDots();
}

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`dot${i}`);
        if (i < currentPin.length) dot.classList.add("filled");
        else dot.classList.remove("filled");
    }
}

function checkPin() {
    const errorMsg = document.getElementById("pinError");
    if (currentPin === CORRECT_PIN) {
        errorMsg.innerText = "";
        document.querySelector(".pin-keypad").style.display = "none";
        document.querySelector(".pin-display").style.display = "none";
        document.getElementById("splashLoading").style.display = "flex";

        setTimeout(() => {
            const splash = document.getElementById("splashScreen");
            if (splash) splash.classList.add("hidden");
            showToast("Akses LibTrack Diberikan!");
        }, 1000);
    } else {
        errorMsg.innerText = "PIN Salah! Coba lagi ";
        clearPin();
    }
}

function openQrModal(kodeBarang, namaBarang) {
    const qrImage = document.getElementById("qrImage");
    const qrCodeText = document.getElementById("qrCodeText");
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(kodeBarang)}`;
    qrCodeText.innerText = `${namaBarang} (${kodeBarang})`;
    document.getElementById("qrModalOverlay").classList.add("active");
}

function closeQrModal() { document.getElementById("qrModalOverlay").classList.remove("active"); }
function cetakQrCode() { window.print(); }

function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

function setKondisiTab(kondisi, element) {
    activeKondisiFilter = kondisi;
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    renderData();
}

function renderData() {
    const listContainer = document.getElementById("inventoryList");
    const searchKeyword = document.getElementById("searchInput").value.toLowerCase();
    const filterRuangan = document.getElementById("filterRuangan").value;
    const filterKategori = document.getElementById("filterKategori").value;

    let filteredData = inventaris.filter(item => {
        const matchSearch = item.nama.toLowerCase().includes(searchKeyword) || 
                            item.kode.toLowerCase().includes(searchKeyword) ||
                            (item.kategori && item.kategori.toLowerCase().includes(searchKeyword));
        const matchRuangan = filterRuangan === "" || item.ruangan === filterRuangan;
        const matchKategori = filterKategori === "" || item.kategori === filterKategori;
        const matchKondisi = activeKondisiFilter === "" || item.kondisi === activeKondisiFilter;

        return matchSearch && matchRuangan && matchKategori && matchKondisi;
    });

    updateStatistik();
    renderDistribution();

    listContainer.innerHTML = "";

    if (filteredData.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">Belum ada data inventaris ditemukan</div>`;
        return;
    }

    filteredData.forEach(item => {
        const badgeClass = item.kondisi.replace(/\s+/g, '-');
        listContainer.innerHTML += `
            <div class="item-card">
                <div class="item-header">
                    <div>
                        <div class="item-title">${escapeHtml(item.nama)}</div>
                        <div class="item-code">${escapeHtml(item.kode)}</div>
                    </div>
                    <span class="badge-kondisi badge-${badgeClass}">${escapeHtml(item.kondisi)}</span>
                </div>
                <div class="item-body">
                    <span>📍 ${escapeHtml(item.ruangan)} <span class="badge-tag">${escapeHtml(item.kategori || 'Umum')}</span></span>
                    <span>📦 Jumlah: <strong>${item.jumlah}</strong></span>
                </div>
                <div class="item-actions">
                    <button class="btn-action btn-qr" onclick="openQrModal('${escapeHtml(item.kode)}', '${escapeHtml(item.nama)}')">
                        <i data-lucide="qr-code" style="width: 12px;"></i> QR
                    </button>
                    <button class="btn-action btn-edit" onclick="editData(${item.id})">
                        <i data-lucide="edit-3" style="width: 12px;"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" onclick="hapusData(${item.id})">
                        <i data-lucide="trash-2" style="width: 12px;"></i> Hapus
                    </button>
                </div>
            </div>
        `;
    });

    if (window.lucide) lucide.createIcons();
}

function updateStatistik() {
    const total = inventaris.reduce((acc, curr) => acc + Number(curr.jumlah), 0);
    const baik = inventaris.filter(i => i.kondisi === "Baik").reduce((acc, curr) => acc + Number(curr.jumlah), 0);
    const dipinjamTotal = peminjaman.filter(p => !p.dikembalikan).reduce((acc, curr) => acc + Number(curr.jumlah), 0);

    document.getElementById("statTotal").innerText = total;
    document.getElementById("statBaik").innerText = baik;
    document.getElementById("statDipinjam").innerText = dipinjamTotal;

    const alertWidget = document.getElementById("alertWidget");
    const alertText = document.getElementById("alertWidgetText");
    const rusakBeratCount = inventaris.filter(i => i.kondisi === "Rusak Berat").length;
    const sedikitCount = inventaris.filter(i => Number(i.jumlah) <= 2).length;

    if (rusakBeratCount > 0 || sedikitCount > 0) {
        alertWidget.style.display = "flex";
        alertText.innerText = `Peringatan: ${rusakBeratCount} barang rusak berat & ${sedikitCount} barang stok ≤ 2`;
    } else {
        alertWidget.style.display = "none";
    }
}

function renderDistribution() {
    const distContainer = document.getElementById("areaDistributionList");
    if (!distContainer) return;

    const areas = ["Rak Buku Utama", "Area Baca", "Meja Sirkulasi", "Ruang Komputer / E-Lib", "Gudang / Arsip"];
    distContainer.innerHTML = "";

    areas.forEach(area => {
        const count = inventaris.filter(i => i.ruangan === area).reduce((acc, curr) => acc + Number(curr.jumlah), 0);
        distContainer.innerHTML += `
            <div class="dist-item">
                <span>${area}</span>
                <strong>${count} barang</strong>
            </div>
        `;
    });
}

// PEMINJAMAN LOGIC
function openModalPinjam() {
    const select = document.getElementById("pinjamItemId");
    select.innerHTML = "";
    inventaris.forEach(item => {
        select.innerHTML += `<option value="${item.id}">${item.nama} (Stok: ${item.jumlah})</option>`;
    });
    document.getElementById("modalPinjamOverlay").classList.add("active");
}

function closeModalPinjam() {
    document.getElementById("modalPinjamOverlay").classList.remove("active");
}

function simpanPeminjaman(event) {
    event.preventDefault();
    const itemId = Number(document.getElementById("pinjamItemId").value);
    const peminjam = document.getElementById("namaPeminjam").value.trim();
    const jumlah = parseInt(document.getElementById("jumlahPinjam").value);

    const item = inventaris.find(i => i.id === itemId);
    if (!item || item.jumlah < jumlah) {
        alert("Stok barang tidak mencukupi!");
        return;
    }

    item.jumlah -= jumlah;
    const dataPinjam = {
        id: Date.now(),
        itemId,
        namaBarang: item.nama,
        peminjam,
        jumlah,
        tanggal: new Date().toLocaleDateString('id-ID'),
        dikembalikan: false
    };

    peminjaman.unshift(dataPinjam);
    localStorage.setItem("libtrack_inventory", JSON.stringify(inventaris));
    localStorage.setItem("libtrack_peminjaman", JSON.stringify(peminjaman));

    closeModalPinjam();
    renderData();
    renderPeminjaman();
    showToast("Peminjaman berhasil dicatat");
}

function kembalikanBarang(id) {
    const record = peminjaman.find(p => p.id === id);
    if (!record) return;

    const item = inventaris.find(i => i.id === record.itemId);
    if (item) item.jumlah += record.jumlah;

    record.dikembalikan = true;
    localStorage.setItem("libtrack_inventory", JSON.stringify(inventaris));
    localStorage.setItem("libtrack_peminjaman", JSON.stringify(peminjaman));

    renderData();
    renderPeminjaman();
    showToast("Barang telah dikembalikan");
}

function renderPeminjaman() {
    const container = document.getElementById("peminjamanList");
    if (!container) return;
    container.innerHTML = "";

    const aktif = peminjaman.filter(p => !p.dikembalikan);
    if (aktif.length === 0) {
        container.innerHTML = `<div class="empty-state">Tidak ada barang yang sedang dipinjam</div>`;
        return;
    }

    aktif.forEach(p => {
        container.innerHTML += `
            <div class="peminjaman-item">
                <div class="peminjaman-info">
                    <span class="peminjaman-name">${escapeHtml(p.namaBarang)} (${p.jumlah})</span>
                    <span>Peminjam: ${escapeHtml(p.peminjam)} | Tgl: ${p.tanggal}</span>
                </div>
                <button class="btn-primary-sm" onclick="kembalikanBarang(${p.id})">Kembalikan</button>
            </div>
        `;
    });
}

function openModalBaru() {
    document.getElementById("inventoryForm").reset();
    document.getElementById("itemId").value = "";
    document.getElementById("modalTitle").innerText = "Tambah Inventaris";
    document.getElementById("modalOverlay").classList.add("active");
}

function closeModal() { document.getElementById("modalOverlay").classList.remove("active"); }

function simpanData(event) {
    event.preventDefault();
    const id = document.getElementById("itemId").value;
    const nama = document.getElementById("namaBarang").value.trim();
    const kode = document.getElementById("kodeInventaris").value.trim();
    const kategori = document.getElementById("kategoriBarang").value;
    const ruangan = document.getElementById("namaRuangan").value;
    const jumlah = parseInt(document.getElementById("jumlahBarang").value);
    const kondisi = document.getElementById("kondisiBarang").value;

    if (id) {
        inventaris = inventaris.map(item => {
            if (item.id === Number(id)) {
                return { id: Number(id), nama, kode, kategori, ruangan, jumlah, kondisi };
            }
            return item;
        });
        showToast("Data diperbarui");
    } else {
        const dataBaru = { id: Date.now(), nama, kode, kategori, ruangan, jumlah, kondisi };
        inventaris.unshift(dataBaru);
        showToast("Barang ditambahkan");
    }

    localStorage.setItem("libtrack_inventory", JSON.stringify(inventaris));
    closeModal();
    renderData();
}

function editData(id) {
    const item = inventaris.find(i => i.id === id);
    if (!item) return;

    document.getElementById("itemId").value = item.id;
    document.getElementById("namaBarang").value = item.nama;
    document.getElementById("kodeInventaris").value = item.kode;
    document.getElementById("kategoriBarang").value = item.kategori || "Buku";
    document.getElementById("namaRuangan").value = item.ruangan;
    document.getElementById("jumlahBarang").value = item.jumlah;
    document.getElementById("kondisiBarang").value = item.kondisi;

    document.getElementById("modalTitle").innerText = "Edit Inventaris";
    document.getElementById("modalOverlay").classList.add("active");
}

function hapusData(id) {
    if (confirm("Hapus data barang ini?")) {
        inventaris = inventaris.filter(i => i.id !== id);
        localStorage.setItem("libtrack_inventory", JSON.stringify(inventaris));
        renderData();
        showToast("Data dihapus");
    }
}

function resetSemuaData() {
    if (confirm("Hapus seluruh data inventaris?")) {
        inventaris = [];
        peminjaman = [];
        localStorage.removeItem("libtrack_inventory");
        localStorage.removeItem("libtrack_peminjaman");
        renderData();
        renderPeminjaman();
        showToast("Seluruh data dikosongkan");
    }
}

function cetakLaporan() { window.print(); }

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ inventaris, peminjaman }));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `libtrack_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("File backup diunduh");
}

function importData(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.inventaris) {
                inventaris = imported.inventaris;
                peminjaman = imported.peminjaman || [];
            } else if (Array.isArray(imported)) {
                inventaris = imported;
            }
            localStorage.setItem("libtrack_inventory", JSON.stringify(inventaris));
            localStorage.setItem("libtrack_peminjaman", JSON.stringify(peminjaman));
            renderData();
            renderPeminjaman();
            showToast("Data diimport");
        } catch (err) {
            alert("File JSON tidak valid!");
        }
    };
    reader.readAsText(event.target.files[0]);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(err => console.log(err));
}