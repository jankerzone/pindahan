// Fungsi untuk menyimpan data kardus ke API
async function saveBoxData(label, content) {
  try {
    const response = await fetch("/api/boxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: label,
        content: content
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== ""),
      }),
    });

    if (!response.ok) {
      throw new Error("Gagal menyimpan data kardus");
    }

    const data = await response.json();
    return data.id; // Return ID yang di-generate oleh server
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Fungsi untuk mengambil data kardus dari API
async function loadBoxData(boxId) {
  try {
    const response = await fetch(`/api/boxes/${boxId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Kardus tidak ditemukan");
      }
      throw new Error("Gagal mengambil data kardus");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Fungsi untuk menampilkan mode input
function showInputMode() {
  document.getElementById("input-mode").classList.add("active");
  document.getElementById("input-mode").classList.remove("hidden");
  document.getElementById("detail-mode").classList.add("hidden");
  document.getElementById("detail-mode").classList.remove("active");
  // Hapus hash dari URL
  history.pushState(null, null, " ");
}

// Fungsi untuk menampilkan mode detail
async function showDetailMode(boxId) {
  try {
    const boxData = await loadBoxData(boxId);

    document.getElementById("input-mode").classList.remove("active");
    document.getElementById("input-mode").classList.add("hidden");
    document.getElementById("detail-mode").classList.remove("hidden");
    document.getElementById("detail-mode").classList.add("active");

    document.getElementById("display-id").textContent = boxData.id;
    document.getElementById("display-label").textContent = boxData.label;

    // Simpan data kardus untuk keperluan search
    window.currentBoxData = boxData;

    // Render items (tampilkan semua item)
    renderItems(boxData, "");

    // Setup event listener untuk search
    setupSearchListener(boxId);

    // Generate QR Code untuk halaman detail
    generateDetailQrCode(boxId);

    const addItemButton = document.getElementById("add-item-btn");
    const newItemInput = document.getElementById("new-item-text");

    const handleNewItemSubmit = async () => {
      const newItemText = newItemInput.value.trim();
      if (newItemText === "") {
        alert("Item tidak boleh kosong!");
        newItemInput.focus();
        return;
      }
      await addItem(boxId, newItemText);
      newItemInput.value = ""; // Clear input
      showDetailMode(boxId); // Refresh tampilan
    };

    // Event handler untuk tombol tambah item baru
    addItemButton.onclick = async () => {
      await handleNewItemSubmit();
    };

    // Izinkan submit menggunakan tombol Enter
    newItemInput.onkeydown = async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await handleNewItemSubmit();
      }
    };
  } catch (error) {
    alert("Kardus tidak ditemukan atau terjadi kesalahan: " + error.message);
    showInputMode();
  }
}

// Fungsi untuk generate QR Code pada halaman detail
function generateDetailQrCode(boxId) {
  const directUrl = `${window.location.origin}/#${boxId}`;
  const encodedDirectUrl = encodeURIComponent(directUrl);
  const timestamp = Date.now();
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedDirectUrl}&size=200x200&format=png&t=${timestamp}`;
  const qrCodeContainer = document.getElementById("detail-qr-container");
  
  console.log("Generating detail QR code for URL:", directUrl);
  
  // Clear container first
  qrCodeContainer.innerHTML = "";
  
  // Create image element with proper CORS handling
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = qrCodeUrl;
  img.alt = `QR Code untuk kardus ${boxId}`;
  img.style.maxWidth = "200px";
  img.style.height = "auto";
  img.style.border = "1px solid #ddd";
  img.style.borderRadius = "4px";
  img.style.padding = "5px";
  img.style.backgroundColor = "white";
  img.loading = "lazy";
  
  // Append image immediately to container
  qrCodeContainer.appendChild(img);
  console.log("Detail QR image appended to container");
  
  // Handle image loading errors
  img.onerror = function() {
    console.log("Failed to load PNG QR code, trying SVG fallback");
    const svgImg = new Image();
    svgImg.crossOrigin = 'anonymous';
    svgImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedDirectUrl}&size=200x200&format=svg&t=${timestamp}`;
    svgImg.alt = `QR Code untuk kardus ${boxId}`;
    svgImg.style.maxWidth = "200px";
    svgImg.style.height = "auto";
    svgImg.style.border = "1px solid #ddd";
    svgImg.style.borderRadius = "4px";
    svgImg.style.padding = "5px";
    svgImg.style.backgroundColor = "white";
    
    // Replace the failed PNG image with SVG
    qrCodeContainer.innerHTML = "";
    qrCodeContainer.appendChild(svgImg);
    console.log("SVG detail QR image appended to container");
    
    svgImg.onerror = function() {
      console.error("Failed to load both PNG and SVG QR codes");
      qrCodeContainer.innerHTML = `<div class="error-message"><p>Gagal memuat QR Code.</p><p>Anda bisa mengakses langsung melalui: <a href="${directUrl}" target="_blank">${directUrl}</a></p></div>`;
    };
    
    svgImg.onload = function() {
      console.log("SVG detail QR code loaded successfully");
    };
  };
  
  // Handle successful image loading
  img.onload = function() {
    console.log("Detail QR code loaded successfully, image dimensions:", img.naturalWidth, "x", img.naturalHeight);
  };
  
  // Add save button functionality for detail page
  const saveBtn = document.getElementById("save-detail-qr-btn");
  if (saveBtn) {
    saveBtn.onclick = function() {
      console.log("Detail save button clicked, boxId:", boxId);
      saveQrAsImage(boxId, directUrl);
    };
  }
}

// Fungsi untuk render items dengan filter
function renderItems(boxData, searchTerm = "") {
  const contentList = document.getElementById("display-content");
  contentList.innerHTML = "";

  // Parse content dari string JSON ke array
  const items =
    typeof boxData.content === "string"
      ? JSON.parse(boxData.content)
      : boxData.content;

  // Filter items berdasarkan search term
  let itemsToRender = items.map((item, index) => ({
    item,
    originalIndex: index,
  }));
  if (searchTerm) {
    itemsToRender = itemsToRender.filter(({ item }) => {
      const itemText = (item.text || item).toLowerCase();
      return itemText.includes(searchTerm.toLowerCase());
    });
  }

  // Tampilkan pesan jika tidak ada hasil
  if (itemsToRender.length === 0 && searchTerm) {
    const li = document.createElement("li");
    li.className = "no-results";
    li.textContent = "Tidak ada item yang sesuai dengan pencarian";
    li.style.textAlign = "center";
    li.style.color = "var(--bs-gray-500)";
    li.style.fontStyle = "italic";
    li.style.padding = "var(--spacing-xl)";
    contentList.appendChild(li);
    return;
  }

  // Render items
  itemsToRender.forEach(({ item, originalIndex }, index) => {
    const li = document.createElement("li");
    li.className = "content-item";
    // Simpan index asli sebagai data attribute
    li.setAttribute("data-original-index", originalIndex);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", () =>
      toggleItemChecked(boxData.id, originalIndex, checkbox.checked),
    );

    const span = document.createElement("span");
    const itemText = item.text || item;
    span.textContent = itemText;
    span.className = "item-text";
    if (checkbox.checked) {
      span.classList.add("checked");
    }
    span.addEventListener("click", () =>
      enableEditMode(boxData.id, originalIndex, span),
    );

    // Highlight search term
    if (searchTerm) {
      const regex = new RegExp(`(${searchTerm})`, "gi");
      span.innerHTML = itemText.replace(
        regex,
        '<mark class="search-highlight">$1</mark>',
      );
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Hapus";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () =>
      deleteItem(boxData.id, originalIndex),
    );

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    contentList.appendChild(li);
  });
}

// Fungsi untuk setup search listener
function setupSearchListener(boxId) {
  const searchInput = document.getElementById("search-items");
  if (searchInput) {
    searchInput.value = ""; // Reset search input
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.trim();
      renderItems(window.currentBoxData, searchTerm);
    });
  }
}

// Fungsi untuk menambah item baru
async function addItem(boxId, itemText) {
  try {
    const boxData = await loadBoxData(boxId);
    const items =
      typeof boxData.content === "string"
        ? JSON.parse(boxData.content)
        : boxData.content;
    items.push({ text: itemText, checked: false });
    await updateBoxContent(boxId, items);
  } catch (error) {
    console.error("Error adding item:", error);
    alert("Gagal menambah item");
  }
}

// Fungsi untuk mengaktifkan mode edit pada item
function enableEditMode(boxId, itemIndex, spanElement) {
  const currentText = spanElement.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.className = "edit-item-input";

  spanElement.replaceWith(input);
  input.focus();

  const saveEdit = async () => {
    const newText = input.value.trim();
    if (newText === "") {
      alert("Item tidak boleh kosong!");
      input.focus();
      return;
    }
    if (newText !== currentText) {
      await editItem(boxId, itemIndex, newText);
    }
    showDetailMode(boxId); // Refresh tampilan
  };

  input.addEventListener("blur", saveEdit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  });
}

// Fungsi untuk mengedit item yang sudah ada
async function editItem(boxId, itemIndex, newText) {
  try {
    const boxData = await loadBoxData(boxId);
    const items =
      typeof boxData.content === "string"
        ? JSON.parse(boxData.content)
        : boxData.content;

    if (typeof items[itemIndex] === "string") {
      items[itemIndex] = { text: newText, checked: false };
    } else {
      items[itemIndex].text = newText;
    }
    await updateBoxContent(boxId, items);
  } catch (error) {
    console.error("Error editing item:", error);
    alert("Gagal mengedit item");
  }
}

// Fungsi untuk toggle status checklist item
async function toggleItemChecked(boxId, itemIndex, isChecked) {
  try {
    const boxData = await loadBoxData(boxId);
    const items =
      typeof boxData.content === "string"
        ? JSON.parse(boxData.content)
        : boxData.content;

    // Update item status
    if (typeof items[itemIndex] === "string") {
      items[itemIndex] = { text: items[itemIndex], checked: isChecked };
    } else {
      items[itemIndex].checked = isChecked;
    }

    // Update UI
    const itemText = document.querySelectorAll(".item-text")[itemIndex];
    if (isChecked) {
      itemText.classList.add("checked");
    } else {
      itemText.classList.remove("checked");
    }

    // Simpan perubahan ke server
    await updateBoxContent(boxId, items);
  } catch (error) {
    console.error("Error updating item:", error);
  }
}

// Fungsi untuk menghapus item
async function deleteItem(boxId, itemIndex) {
  if (!confirm("Hapus item ini?")) return;

  try {
    const boxData = await loadBoxData(boxId);
    const items =
      typeof boxData.content === "string"
        ? JSON.parse(boxData.content)
        : boxData.content;

    // Hapus item dari array
    items.splice(itemIndex, 1);

    // Simpan perubahan ke server
    await updateBoxContent(boxId, items);

    // Refresh tampilan
    showDetailMode(boxId);
  } catch (error) {
    console.error("Error deleting item:", error);
    alert("Gagal menghapus item");
  }
}

// Fungsi untuk update content kardus
async function updateBoxContent(boxId, content) {
  try {
    const response = await fetch(`/api/boxes/${boxId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: content }),
    });

    if (!response.ok) {
      throw new Error("Gagal memperbarui kardus");
    }

    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Event listener untuk form submit
document
  .getElementById("box-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const label = document.getElementById("box-label").value;
    const content = document.getElementById("box-content").value;

    if (!label || !content) {
      alert("Harap isi semua field!");
      return;
    }

    try {
      // Simpan data ke API
      const boxId = await saveBoxData(label, content);

      // Tampilkan hasil dengan URL clickable
      document.getElementById("generated-id").textContent = boxId;

      // Buat URL clickable
      const boxUrl = `${window.location.origin}/#${boxId}`;
      const urlElement = document.getElementById("box-url");
      urlElement.innerHTML = `<a href="${boxUrl}" target="_blank">${boxUrl}</a>`;
      
      // Buat short URL untuk QR Code
      const shortUrl = `${window.location.origin}/b/${boxId}`;
      const shortUrlElement = document.getElementById("box-short-url");
      shortUrlElement.innerHTML = `<a href="${shortUrl}" target="_blank">${shortUrl}</a>`;
      // Pastikan short URL terlihat
      shortUrlElement.style.display = "block";
      shortUrlElement.style.wordBreak = "break-all";
      shortUrlElement.style.padding = "10px";
      shortUrlElement.style.backgroundColor = "#f8f9fa";
      shortUrlElement.style.border = "1px solid #dee2e6";
      shortUrlElement.style.borderRadius = "4px";
      
      // Tambahkan penanganan error jika short URL tidak muncul
      if (!shortUrlElement.innerHTML || shortUrlElement.innerHTML.trim() === "") {
        shortUrlElement.innerHTML = `<a href="${shortUrl}" target="_blank">${shortUrl}</a>`;
      }
      
      // Generate QR Code menggunakan QR Server API dengan CORS handling
      // Use the direct hash URL instead of short URL for QR code generation
      const directUrl = `${window.location.origin}/#${boxId}`;
      const encodedDirectUrl = encodeURIComponent(directUrl);
      // Add a cache buster to prevent caching issues
      const timestamp = Date.now();
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedDirectUrl}&size=200x200&format=png&t=${timestamp}`;
      const qrCodeContainer = document.getElementById("qr-code-container");
      
      console.log("Generating QR code for URL:", directUrl);
      console.log("QR code URL:", qrCodeUrl);
      
      // Clear container first
      qrCodeContainer.innerHTML = "";
      
      // Create image element with proper CORS handling
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS for canvas operations
      img.src = qrCodeUrl;
      img.alt = `QR Code untuk kardus ${boxId}`;
      img.style.maxWidth = "200px";
      img.style.height = "auto";
      img.style.border = "1px solid #ddd";
      img.style.borderRadius = "4px";
      img.style.padding = "5px";
      img.style.backgroundColor = "white";
      img.loading = "lazy"; // Lazy load the image
      
      // Append image immediately to container (it will load asynchronously)
      qrCodeContainer.appendChild(img);
      console.log("QR image appended to container");
      
      // Handle image loading errors
      img.onerror = function() {
        console.log("Failed to load PNG QR code, trying SVG fallback");
        const svgImg = new Image();
        svgImg.crossOrigin = 'anonymous';
        svgImg.src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodedDirectUrl}&size=200x200&format=svg&t=${timestamp}`;
        svgImg.alt = `QR Code untuk kardus ${boxId}`;
        svgImg.style.maxWidth = "200px";
        svgImg.style.height = "auto";
        svgImg.style.border = "1px solid #ddd";
        svgImg.style.borderRadius = "4px";
        svgImg.style.padding = "5px";
        svgImg.style.backgroundColor = "white";
        
        // Replace the failed PNG image with SVG
        qrCodeContainer.innerHTML = "";
        qrCodeContainer.appendChild(svgImg);
        console.log("SVG QR image appended to container");
        
        svgImg.onerror = function() {
          console.error("Failed to load both PNG and SVG QR codes");
          qrCodeContainer.innerHTML = `<div class="error-message"><p>Gagal memuat QR Code.</p><p>Anda bisa mengakses langsung melalui: <a href="${directUrl}" target="_blank">${directUrl}</a></p></div>`;
        };
        
        svgImg.onload = function() {
          console.log("SVG QR code loaded successfully");
        };
      };
      
      // Handle successful image loading
      img.onload = function() {
        console.log("QR code loaded successfully, image dimensions:", img.naturalWidth, "x", img.naturalHeight);
      };

      // Add save button functionality
      const saveBtn = document.getElementById("save-qr-btn");
      if (saveBtn) {
        // Add event listener
        saveBtn.onclick = function() {
          console.log("Save button clicked, boxId:", boxId);
          saveQrAsImage(boxId, shortUrl);
        };
      }

      document.getElementById("result").classList.remove("hidden");

      // Reset form
      document.getElementById("box-form").reset();
    } catch (error) {
      alert("Gagal menyimpan kardus: " + error.message);
    }
  });

// Event listener untuk tombol tambah kardus lain
document.getElementById("new-box").addEventListener("click", function () {
  document.getElementById("result").classList.add("hidden");
});

// Event listener untuk tombol kembali ke input
document.getElementById("back-to-input").addEventListener("click", function () {
  showInputMode();
});

// Deteksi hash change di URL
window.addEventListener("hashchange", function () {
  const hash = window.location.hash.substring(1); // Hapus tanda #
  console.log("Hash changed to:", hash);
  if (hash && hash.length === 4) {
    showDetailMode(hash);
  } else {
    showInputMode();
  }
});

// Inisialisasi aplikasi
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded - Initializing app...");

  // Setup Enter key pada input ID unik
  const idUnikInput = document.getElementById("idUnikInput");
  if (idUnikInput) {
    idUnikInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const id = idUnikInput.value.trim().toUpperCase();
        if (id.length === 4) {
          window.open(window.location.origin + "/#" + id, "_blank");
        } else {
          alert("Mohon masukkan 4 karakter ID unik.");
        }
      }
    });
  }

  // Check initial hash on page load
  const initialHash = window.location.hash.substring(1);
  console.log("Initial hash:", initialHash);
  if (initialHash && initialHash.length === 4) {
    console.log("Loading detail mode for hash:", initialHash);
    showDetailMode(initialHash);
  } else {
    console.log("Showing input mode (no valid hash)");
    showInputMode();
  }
 console.log("App initialization complete");
 
});

// Function to save QR code as image
function saveQrAsImage(boxId, shortUrl) {
  console.log('saveQrAsImage called with boxId:', boxId, 'shortUrl:', shortUrl);
  
  try {
    // Get the QR code image
    const qrImg = document.querySelector('#qr-code-container img');
    console.log('QR image found:', qrImg);
    
    if (!qrImg) {
      console.error('QR code image not found');
      alert('QR code belum tersedia');
      return;
    }

    // Check if image is loaded and ready
    console.log('QR image complete:', qrImg.complete, 'naturalWidth:', qrImg.naturalWidth);
    if (!qrImg.complete || qrImg.naturalWidth === 0) {
      console.warn('QR code image not fully loaded');
      alert('QR code sedang dimuat. Tunggu sebentar dan coba lagi.');
      return;
    }

    // Create a canvas element to combine the URL and QR code
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    console.log('Canvas created');
    
    // Set canvas dimensions
    const padding = 40;
    const titleHeight = 50;
    const urlHeight = 60;
    const qrSize = 300;
    const footerHeight = 40;
    const totalWidth = qrSize + (padding * 2);
    const totalHeight = titleHeight + urlHeight + qrSize + footerHeight + (padding * 4);
    
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    console.log('Canvas dimensions set:', canvas.width, 'x', canvas.height);
    
    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#0d6efd';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KARDUS PINDAHAN', canvas.width / 2, padding + 20);
    
    // Draw box ID
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(boxId, canvas.width / 2, padding + 50);
    
    // Draw full URL label
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.fillText('URL Lengkap:', canvas.width / 2, padding + titleHeight + 20);
    
    // Draw full URL
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    const fullUrl = `${window.location.origin}/#${boxId}`;
    ctx.fillText(fullUrl, canvas.width / 2, padding + titleHeight + 45);
    
    // Draw QR code - handle CORS issues
    console.log('Attempting to draw QR image onto canvas');
    try {
      ctx.drawImage(qrImg, padding, padding + titleHeight + urlHeight, qrSize, qrSize);
      console.log('QR image drawn successfully');
    } catch (drawError) {
      console.error('Error drawing QR image:', drawError);
      // Fallback: create a new image with proper CORS handling
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.onload = function() {
        console.log('Fallback QR image loaded successfully');
        ctx.drawImage(fallbackImg, padding, padding + titleHeight + urlHeight, qrSize, qrSize);
        completeCanvasDownload(canvas, boxId);
      };
      fallbackImg.onerror = function() {
        console.error('Fallback QR image failed to load');
        // If fallback also fails, show error message
        alert('Gagal memuat gambar QR code. Silakan coba lagi atau gunakan URL langsung.');
        return;
      };
      fallbackImg.src = qrImg.src;
      return; // Wait for fallback image to load
    }
    
    // Draw footer
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.fillText('Scan QR Code untuk membuka isi kardus', canvas.width / 2, padding + titleHeight + urlHeight + qrSize + 25);
    
    // Draw border
    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Convert to data URL and download
    console.log('Completing canvas download');
    completeCanvasDownload(canvas, boxId);
  } catch (error) {
    console.error('Error saving QR image:', error);
    alert('Gagal menyimpan gambar. Silakan coba lagi.');
  }
}

// Helper function to complete canvas download
function completeCanvasDownload(canvas, boxId) {
  console.log('completeCanvasDownload called');
  try {
    console.log('Converting canvas to data URL');
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Data URL created:', dataUrl.substring(0, 50) + '...');
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `kardus-pindahan-${boxId}.png`;
    console.log('Download link created, filename:', a.download);
    
    document.body.appendChild(a);
    console.log('Link appended to body');
    a.click();
    console.log('Link clicked, download should start');
    document.body.removeChild(a);
    console.log('Link removed from body');
  } catch (downloadError) {
    console.error('Error downloading image:', downloadError);
    alert('Gagal mengunduh gambar. Silakan coba lagi.');
  }
}
