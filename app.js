/* ===========================
   AK'S CAT TRACKER — FIREBASE APP LOGIC
   =========================== */

/* ---- Firebase Init ---- */
firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.firestore();

/* ---- State ---- */
let cats       = [];
let editingId  = null;
let viewingId  = null;
let currentUid = null;
let catsCol    = null;      // Set after login
let unsubscribe = null;     // Firestore listener

let pendingPhotoFile   = null;
let pendingPhotoBase64 = null;

/* ---- DOM Refs ---- */
const catGrid           = document.getElementById('catGrid');
const emptyState        = document.getElementById('emptyState');
const statTotal         = document.getElementById('statTotal');
const statBreeds        = document.getElementById('statBreeds');
const statAvgAge        = document.getElementById('statAvgAge');
const searchInput       = document.getElementById('searchInput');

// Navbar
const openAddBtn        = document.getElementById('openAddModal');
const logoutBtn         = document.getElementById('logoutBtn');
const navUserEmail      = document.getElementById('navUserEmail');

// Add/Edit modal
const modalOverlay      = document.getElementById('modalOverlay');
const closeModalBtn     = document.getElementById('closeModal');
const cancelModalBtn    = document.getElementById('cancelModal');
const catForm           = document.getElementById('catForm');
const modalTitle        = document.getElementById('modalTitle');
const photoInput        = document.getElementById('catPhoto');
const photoPreviewWrap  = document.getElementById('photoPreviewWrap');
const photoPreviewImg   = document.getElementById('photoPreview');
const uploadArea        = document.getElementById('uploadArea');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const fileInput         = document.getElementById('catPhotoFile');
const removePhotoBtn    = document.getElementById('removePhoto');

// View modal
const viewModalOverlay  = document.getElementById('viewModalOverlay');
const closeViewBtn      = document.getElementById('closeViewModal');
const editFromViewBtn   = document.getElementById('editFromView');
const deleteFromViewBtn = document.getElementById('deleteFromView');

// Login overlay
const loginOverlay  = document.getElementById('loginOverlay');
const loginForm     = document.getElementById('loginForm');
const authEmail     = document.getElementById('authEmail');
const authPassword  = document.getElementById('authPassword');
const loginBtn      = document.getElementById('loginBtn');
const signupBtn     = document.getElementById('signupBtn');

// Toast container
const toastContainer = createToastContainer();

/* ========================
   FIREBASE AUTH
   ======================== */

// Watch for auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    // --- Logged IN ---
    currentUid = user.uid;
    catsCol = db.collection('users').doc(user.uid).collection('cats');

    // Update navbar
    navUserEmail.textContent = user.email;
    navUserEmail.style.display = 'inline';
    logoutBtn.style.display = 'inline-block';
    openAddBtn.style.display = 'inline-flex';

    // Hide login overlay
    loginOverlay.classList.remove('open');

    // Start real-time sync for THIS user's cats
    startSync();

  } else {
    // --- Logged OUT ---
    currentUid = null;
    catsCol = null;

    // Stop Firestore listener
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    // Clear cats from UI
    cats = [];
    renderAll();

    // Update navbar
    navUserEmail.style.display = 'none';
    logoutBtn.style.display = 'none';
    openAddBtn.style.display = 'none';

    // Show login overlay
    loginOverlay.classList.add('open');
  }
});

// Login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const pass  = authPassword.value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged handles the rest
  } catch (err) {
    showToast(friendlyAuthError(err.code), 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// Sign up button
signupBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const pass  = authPassword.value;

  if (!email || !pass) {
    showToast('Please enter your email and a password.', 'error');
    return;
  }
  if (pass.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account…';

  try {
    await auth.createUserWithEmailAndPassword(email, pass);
    showToast('🎉 Account created! Welcome!', 'success');
  } catch (err) {
    showToast(friendlyAuthError(err.code), 'error');
    signupBtn.disabled = false;
    signupBtn.textContent = 'Create Account';
  }
});

// Logout button
logoutBtn.addEventListener('click', async () => {
  await auth.signOut();
  showToast('👋 Logged out.', 'success');
});

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/user-not-found':      return '❌ No account found with that email.';
    case 'auth/wrong-password':      return '❌ Incorrect password.';
    case 'auth/invalid-email':       return '❌ Please enter a valid email address.';
    case 'auth/email-already-in-use':return '❌ That email is already registered. Try signing in.';
    case 'auth/weak-password':       return '❌ Password must be at least 6 characters.';
    case 'auth/invalid-credential':  return '❌ Email or password is incorrect.';
    default:                         return '❌ Something went wrong. Please try again.';
  }
}

/* ========================
   REAL-TIME FIRESTORE SYNC
   ======================== */
function startSync() {
  if (unsubscribe) unsubscribe(); // Clean up old listener

  unsubscribe = catsCol.orderBy('createdAt', 'desc').onSnapshot(
    (snapshot) => {
      cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderAll(searchInput.value);
    },
    (error) => {
      console.error('Firestore error:', error);
      showToast('⚠️ Could not connect to database.', 'error');
    }
  );
}

/* ========================
   PHOTO UPLOAD HANDLERS
   ======================== */

uploadArea.addEventListener('click', (e) => {
  if (e.target === removePhotoBtn || removePhotoBtn.contains(e.target)) return;
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Please select an image file.', 'error');
    return;
  }
  pendingPhotoFile   = file;
  pendingPhotoBase64 = null;
  const objectUrl = URL.createObjectURL(file);
  showPhotoPreview(objectUrl);
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  }
});

photoInput.addEventListener('input', () => {
  const url = photoInput.value.trim();
  if (url) {
    pendingPhotoFile = null;
    showPhotoPreview(url);
  } else {
    hidePhotoPreview();
  }
});

removePhotoBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  pendingPhotoFile   = null;
  pendingPhotoBase64 = null;
  fileInput.value    = '';
  photoInput.value   = '';
  hidePhotoPreview();
});

function showPhotoPreview(src) {
  photoPreviewImg.src = src;
  photoPreviewWrap.style.display  = 'block';
  uploadPlaceholder.style.display = 'none';
}
function hidePhotoPreview() {
  photoPreviewImg.src = '';
  photoPreviewWrap.style.display  = 'none';
  uploadPlaceholder.style.display = 'flex';
}
function resetPhotoUI() {
  pendingPhotoFile   = null;
  pendingPhotoBase64 = null;
  fileInput.value    = '';
  photoInput.value   = '';
  hidePhotoPreview();
}

/* ========================
   PHOTO COMPRESSION
   ======================== */

async function compressImageToBase64(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width  = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width  = maxWidth;
        }
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.8));
      };
    };
  });
}

/* ========================
   RENDER
   ======================== */
function renderAll(query = '') {
  const q        = query.trim().toLowerCase();
  const filtered = q
    ? cats.filter(c => c.name.toLowerCase().includes(q) || c.breed.toLowerCase().includes(q))
    : cats;

  catGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = q ? 'No cats found.' : 'No cats yet!';
    emptyState.querySelector('p').innerHTML = q
      ? `No cats match "<strong>${escHtml(q)}</strong>".`
      : 'Click <strong>+ Add Cat</strong> to start building your feline family profile.';
  } else {
    emptyState.style.display = 'none';
    filtered.forEach((cat, i) => {
      const card = buildCard(cat);
      card.style.animationDelay = `${i * 0.05}s`;
      catGrid.appendChild(card);
    });
  }

  updateStats();
}

function buildCard(cat) {
  const card = document.createElement('article');
  card.className = 'cat-card';
  card.dataset.id = cat.id;
  card.setAttribute('aria-label', `${cat.name} the ${cat.breed}`);

  const photoHtml = cat.photo
    ? `<img class="card-photo" src="${escHtml(cat.photo)}" alt="${escHtml(cat.name)}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
       <div class="card-photo-placeholder" style="display:none;">🐱</div>`
    : `<div class="card-photo-placeholder">🐱</div>`;

  const genderBadge = cat.gender
    ? `<span class="card-gender-badge">${cat.gender === 'Male' ? '♂ Male' : '♀ Female'}</span>` : '';

  const traitHtml = (cat.traits || []).slice(0, 3)
    .map(t => `<span class="trait-tag">${escHtml(t)}</span>`).join('');

  card.innerHTML = `
    <div class="card-photo-wrap">
      ${photoHtml}
      ${genderBadge}
    </div>
    <div class="card-body">
      <p class="card-name">${escHtml(cat.name)}</p>
      <p class="card-breed">${escHtml(cat.breed)}</p>
      <div class="card-meta">
        ${cat.age != null ? `<span class="card-meta-item"><span class="icon">🎂</span>${cat.age} yr${cat.age != 1 ? 's' : ''}</span>` : ''}
        ${cat.weight ? `<span class="card-meta-item"><span class="icon">⚖️</span>${cat.weight} kg</span>` : ''}
        ${cat.color  ? `<span class="card-meta-item"><span class="icon">🎨</span>${escHtml(cat.color)}</span>` : ''}
      </div>
      ${traitHtml ? `<div class="card-traits">${traitHtml}</div>` : ''}
    </div>`;

  card.addEventListener('click', () => openViewModal(cat.id));
  return card;
}

function updateStats() {
  statTotal.textContent  = cats.length;
  const breeds = new Set(cats.map(c => c.breed.toLowerCase()).filter(Boolean));
  statBreeds.textContent = breeds.size;
  const ages = cats.map(c => parseFloat(c.age)).filter(n => !isNaN(n));
  statAvgAge.textContent = ages.length
    ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) + ' yrs'
    : '—';
}

/* ========================
   ADD / EDIT MODAL
   ======================== */
function openAddModal() {
  editingId = null;
  catForm.reset();
  clearTraits();
  resetPhotoUI();
  modalTitle.textContent = 'Add a New Cat';
  document.getElementById('submitBtn').textContent = 'Save Cat 🐾';
  openModal(modalOverlay);
}

function openEditModal(id) {
  const cat = cats.find(c => c.id === id);
  if (!cat) return;
  editingId = id;

  document.getElementById('catId').value     = id;
  document.getElementById('catName').value   = cat.name;
  document.getElementById('catBreed').value  = cat.breed;
  document.getElementById('catAge').value    = cat.age;
  document.getElementById('catWeight').value = cat.weight || '';
  document.getElementById('catGender').value = cat.gender || '';
  document.getElementById('catColor').value  = cat.color  || '';
  document.getElementById('catNotes').value  = cat.notes  || '';

  resetPhotoUI();
  if (cat.photo) {
    photoInput.value = cat.photo;
    showPhotoPreview(cat.photo);
  }

  setTraits(cat.traits || []);
  modalTitle.textContent = `Edit ${cat.name}`;
  document.getElementById('submitBtn').textContent = 'Update Cat 🐾';
  openModal(modalOverlay);
}

catForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!catsCol) return;

  const name  = document.getElementById('catName').value.trim();
  const breed = document.getElementById('catBreed').value.trim();
  const age   = document.getElementById('catAge').value;

  if (!name || !breed || age === '') {
    showToast('Please fill in the required fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const catId = editingId || uid();

    let photoUrl = photoInput.value.trim();
    if (pendingPhotoFile) {
      showToast('📤 Compressing & saving photo…', 'success');
      photoUrl = await compressImageToBase64(pendingPhotoFile);
    }

    const catData = {
      name,
      breed,
      age:       parseFloat(age),
      weight:    parseFloat(document.getElementById('catWeight').value) || null,
      gender:    document.getElementById('catGender').value,
      color:     document.getElementById('catColor').value.trim(),
      photo:     photoUrl,
      notes:     document.getElementById('catNotes').value.trim(),
      traits:    getSelectedTraits(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (editingId) {
      await catsCol.doc(editingId).update(catData);
      showToast(`✅ ${name} updated!`, 'success');
    } else {
      catData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await catsCol.doc(catId).set(catData);
      showToast(`🐾 ${name} added to your family!`, 'success');
    }

    closeModal(modalOverlay);
  } catch (err) {
    console.error(err);
    showToast('❌ Error saving. Check console.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingId ? 'Update Cat 🐾' : 'Save Cat 🐾';
  }
});

/* Trait chips */
document.querySelectorAll('.trait-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('checked');
    chip.querySelector('input').checked = chip.classList.contains('checked');
  });
});
function getSelectedTraits() {
  return [...document.querySelectorAll('.trait-chip.checked')]
    .map(c => c.querySelector('input').value);
}
function clearTraits() {
  document.querySelectorAll('.trait-chip').forEach(c => {
    c.classList.remove('checked');
    c.querySelector('input').checked = false;
  });
}
function setTraits(traits) {
  clearTraits();
  document.querySelectorAll('.trait-chip').forEach(chip => {
    const val = chip.querySelector('input').value;
    if (traits.includes(val)) {
      chip.classList.add('checked');
      chip.querySelector('input').checked = true;
    }
  });
}

/* ========================
   VIEW MODAL
   ======================== */
function openViewModal(id) {
  const cat = cats.find(c => c.id === id);
  if (!cat) return;
  viewingId = id;

  const vPhoto  = document.getElementById('viewPhoto');
  const vHolder = document.getElementById('viewPhotoPlaceholder');
  if (cat.photo) {
    vPhoto.src = cat.photo;
    vPhoto.style.display  = 'block';
    vHolder.style.display = 'none';
    vPhoto.onerror = () => { vPhoto.style.display = 'none'; vHolder.style.display = 'flex'; };
  } else {
    vPhoto.style.display  = 'none';
    vHolder.style.display = 'flex';
  }

  document.getElementById('viewModalName').textContent = cat.name;
  const genderEl = document.getElementById('viewGender');
  genderEl.textContent   = cat.gender ? (cat.gender === 'Male' ? '♂ Male' : '♀ Female') : '';
  genderEl.style.display = cat.gender ? 'inline' : 'none';
  document.getElementById('viewBreed').textContent = cat.breed;

  const statsItems = [
    cat.age    != null ? { val: `${cat.age} yrs`, lbl: 'Age'    } : null,
    cat.weight         ? { val: `${cat.weight} kg`, lbl: 'Weight'} : null,
    cat.color          ? { val: cat.color, lbl: 'Coat'           } : null,
  ].filter(Boolean);
  document.getElementById('viewStatsRow').innerHTML = statsItems.map(s =>
    `<div class="view-stat"><span class="val">${escHtml(String(s.val))}</span><span class="lbl">${s.lbl}</span></div>`
  ).join('');

  document.getElementById('viewTraits').innerHTML =
    (cat.traits || []).map(t => `<span class="trait-tag">${escHtml(t)}</span>`).join('');

  const notesEl = document.getElementById('viewNotes');
  notesEl.textContent   = cat.notes || '';
  notesEl.style.display = cat.notes ? 'block' : 'none';

  openModal(viewModalOverlay);
}

editFromViewBtn.addEventListener('click', () => {
  closeModal(viewModalOverlay);
  setTimeout(() => openEditModal(viewingId), 200);
});

deleteFromViewBtn.addEventListener('click', async () => {
  const cat = cats.find(c => c.id === viewingId);
  if (!cat) return;
  if (!confirm(`Remove ${cat.name} from your family? This cannot be undone.`)) return;

  try {
    await catsCol.doc(viewingId).delete();
    closeModal(viewModalOverlay);
    showToast(`🗑️ ${cat.name} removed.`, 'success');
  } catch (err) {
    showToast('❌ Error deleting cat.', 'error');
  }
});

/* ========================
   MODAL HELPERS
   ======================== */
function openModal(overlay) {
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

openAddBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click',  () => closeModal(modalOverlay));
cancelModalBtn.addEventListener('click', () => closeModal(modalOverlay));
closeViewBtn.addEventListener('click',   () => closeModal(viewModalOverlay));

modalOverlay.addEventListener('click',     e => { if (e.target === modalOverlay)     closeModal(modalOverlay); });
viewModalOverlay.addEventListener('click', e => { if (e.target === viewModalOverlay) closeModal(viewModalOverlay); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(modalOverlay); closeModal(viewModalOverlay); }
});

/* ========================
   SEARCH
   ======================== */
searchInput.addEventListener('input', () => renderAll(searchInput.value));

/* ========================
   TOAST
   ======================== */
function createToastContainer() {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
}
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className   = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.35s ease forwards';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/* ========================
   UTILS
   ======================== */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}
