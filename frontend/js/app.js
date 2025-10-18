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
