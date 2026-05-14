/* ===========================
   CAT LIFE — APP LOGIC
   =========================== */

const STORAGE_KEY = 'cat-life-data';

/* ---- State ---- */
let cats = loadCats();
let editingId = null;
let viewingId = null;

/* ---- DOM Refs ---- */
const catGrid         = document.getElementById('catGrid');
const emptyState      = document.getElementById('emptyState');
const statTotal       = document.getElementById('statTotal');
const statBreeds      = document.getElementById('statBreeds');
const statAvgAge      = document.getElementById('statAvgAge');
const searchInput     = document.getElementById('searchInput');

// Add/Edit modal
const modalOverlay    = document.getElementById('modalOverlay');
const closeModalBtn   = document.getElementById('closeModal');
const cancelModalBtn  = document.getElementById('cancelModal');
const openAddBtn      = document.getElementById('openAddModal');
const catForm         = document.getElementById('catForm');
const modalTitle      = document.getElementById('modalTitle');
const photoInput      = document.getElementById('catPhoto');
const photoPreviewWrap= document.getElementById('photoPreviewWrap');
const photoPreviewImg = document.getElementById('photoPreview');

// View modal
const viewModalOverlay= document.getElementById('viewModalOverlay');
const closeViewBtn    = document.getElementById('closeViewModal');
const editFromViewBtn = document.getElementById('editFromView');
const deleteFromViewBtn = document.getElementById('deleteFromView');

// Toast container
const toastContainer = createToastContainer();

/* ========================
   STORAGE
   ======================== */
function loadCats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || sampleCats();
  } catch {
    return sampleCats();
  }
}

function saveCats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

/* Demo data so the site looks populated on first load */
function sampleCats() {
  return [
    {
      id: uid(),
      name: 'Luna',
      breed: 'Siamese',
      age: 3,
      weight: 3.8,
      gender: 'Female',
      color: 'Cream & Seal Point',
      traits: ['Talkative', 'Cuddly', 'Curious'],
      photo: '',
      notes: 'Luna loves to follow me around the house and chat all day. Very food motivated!',
      createdAt: Date.now(),
    },
    {
      id: uid(),
      name: 'Mochi',
      breed: 'Scottish Fold',
      age: 2,
      weight: 4.5,
      gender: 'Male',
      color: 'Grey Tabby',
      traits: ['Lazy', 'Gentle', 'Cuddly'],
      photo: '',
      notes: 'Mochi sleeps 20 hours a day and is an absolute pro at it.',
      createdAt: Date.now() - 86400000,
    },
  ];
}

/* ========================
   RENDER
   ======================== */
function renderAll(query = '') {
  const q = query.trim().toLowerCase();
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
    ? `<img class="card-photo" src="${escHtml(cat.photo)}" alt="${escHtml(cat.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
       <div class="card-photo-placeholder" style="display:none;">🐱</div>`
    : `<div class="card-photo-placeholder">🐱</div>`;

  const genderBadge = cat.gender
    ? `<span class="card-gender-badge">${cat.gender === 'Male' ? '♂ Male' : '♀ Female'}</span>` : '';

  const traitHtml = (cat.traits || []).slice(0, 3).map(t =>
    `<span class="trait-tag">${escHtml(t)}</span>`).join('');

  card.innerHTML = `
    <div class="card-photo-wrap">
      ${photoHtml}
      ${genderBadge}
    </div>
    <div class="card-body">
      <p class="card-name">${escHtml(cat.name)}</p>
      <p class="card-breed">${escHtml(cat.breed)}</p>
      <div class="card-meta">
        ${cat.age !== '' && cat.age !== undefined ? `<span class="card-meta-item"><span class="icon">🎂</span>${cat.age} yr${cat.age != 1 ? 's' : ''}</span>` : ''}
        ${cat.weight ? `<span class="card-meta-item"><span class="icon">⚖️</span>${cat.weight} kg</span>` : ''}
        ${cat.color ? `<span class="card-meta-item"><span class="icon">🎨</span>${escHtml(cat.color)}</span>` : ''}
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
  photoPreviewWrap.style.display = 'none';
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
  document.getElementById('catColor').value  = cat.color || '';
  document.getElementById('catPhoto').value  = cat.photo || '';
  document.getElementById('catNotes').value  = cat.notes || '';

  setPhotoPreview(cat.photo);
  setTraits(cat.traits || []);

  modalTitle.textContent = `Edit ${cat.name}`;
  document.getElementById('submitBtn').textContent = 'Update Cat 🐾';
  openModal(modalOverlay);
}

catForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name  = document.getElementById('catName').value.trim();
  const breed = document.getElementById('catBreed').value.trim();
  const age   = document.getElementById('catAge').value;

  if (!name || !breed || age === '') {
    showToast('Please fill in the required fields.', 'error');
    return;
  }

  const catData = {
    name,
    breed,
    age:    parseFloat(age),
    weight: parseFloat(document.getElementById('catWeight').value) || null,
    gender: document.getElementById('catGender').value,
    color:  document.getElementById('catColor').value.trim(),
    photo:  document.getElementById('catPhoto').value.trim(),
    notes:  document.getElementById('catNotes').value.trim(),
    traits: getSelectedTraits(),
  };

  if (editingId) {
    const idx = cats.findIndex(c => c.id === editingId);
    if (idx !== -1) {
      cats[idx] = { ...cats[idx], ...catData };
      showToast(`✅ ${name} updated!`, 'success');
    }
  } else {
    cats.unshift({ id: uid(), createdAt: Date.now(), ...catData });
    showToast(`🐾 ${name} added to your family!`, 'success');
  }

  saveCats();
  closeModal(modalOverlay);
  renderAll(searchInput.value);
});

/* Photo preview */
photoInput.addEventListener('input', () => setPhotoPreview(photoInput.value.trim()));

function setPhotoPreview(url) {
  if (url) {
    photoPreviewImg.src = url;
    photoPreviewWrap.style.display = 'block';
  } else {
    photoPreviewWrap.style.display = 'none';
  }
}

/* Trait chips */
document.querySelectorAll('.trait-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('checked');
    chip.querySelector('input').checked = chip.classList.contains('checked');
  });
});

function getSelectedTraits() {
  return [...document.querySelectorAll('.trait-chip.checked')].map(c => c.querySelector('input').value);
}
function clearTraits() {
  document.querySelectorAll('.trait-chip').forEach(c => { c.classList.remove('checked'); c.querySelector('input').checked = false; });
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

  const vPhoto   = document.getElementById('viewPhoto');
  const vHolder  = document.getElementById('viewPhotoPlaceholder');
  if (cat.photo) {
    vPhoto.src = cat.photo;
    vPhoto.style.display = 'block';
    vHolder.style.display = 'none';
    vPhoto.onerror = () => { vPhoto.style.display='none'; vHolder.style.display='flex'; };
  } else {
    vPhoto.style.display = 'none';
    vHolder.style.display = 'flex';
  }

  document.getElementById('viewModalName').textContent = cat.name;
  document.getElementById('viewGender').textContent = cat.gender ? (cat.gender === 'Male' ? '♂ Male' : '♀ Female') : '';
  document.getElementById('viewGender').style.display = cat.gender ? 'inline' : 'none';
  document.getElementById('viewBreed').textContent = cat.breed;

  const statsRow = document.getElementById('viewStatsRow');
  const statsItems = [
    cat.age  !== undefined ? { val: `${cat.age} yrs`, lbl: 'Age' } : null,
    cat.weight ? { val: `${cat.weight} kg`, lbl: 'Weight' } : null,
    cat.color  ? { val: cat.color, lbl: 'Coat' } : null,
  ].filter(Boolean);
  statsRow.innerHTML = statsItems.map(s =>
    `<div class="view-stat"><span class="val">${escHtml(String(s.val))}</span><span class="lbl">${s.lbl}</span></div>`
  ).join('');

  const traitsEl = document.getElementById('viewTraits');
  traitsEl.innerHTML = (cat.traits || []).map(t =>
    `<span class="trait-tag">${escHtml(t)}</span>`).join('');

  const notesEl = document.getElementById('viewNotes');
  if (cat.notes) {
    notesEl.textContent = cat.notes;
    notesEl.style.display = 'block';
  } else {
    notesEl.style.display = 'none';
  }

  openModal(viewModalOverlay);
}

editFromViewBtn.addEventListener('click', () => {
  closeModal(viewModalOverlay);
  setTimeout(() => openEditModal(viewingId), 200);
});

deleteFromViewBtn.addEventListener('click', () => {
  const cat = cats.find(c => c.id === viewingId);
  if (!cat) return;
  if (!confirm(`Remove ${cat.name} from your family? This cannot be undone.`)) return;
  cats = cats.filter(c => c.id !== viewingId);
  saveCats();
  closeModal(viewModalOverlay);
  renderAll(searchInput.value);
  showToast(`🗑️ ${cat.name} removed.`, 'success');
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
closeModalBtn.addEventListener('click', () => closeModal(modalOverlay));
cancelModalBtn.addEventListener('click', () => closeModal(modalOverlay));
closeViewBtn.addEventListener('click', () => closeModal(viewModalOverlay));

// Close on backdrop click
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(modalOverlay); });
viewModalOverlay.addEventListener('click', (e) => { if (e.target === viewModalOverlay) closeModal(viewModalOverlay); });

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal(modalOverlay);
    closeModal(viewModalOverlay);
  }
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
  toast.className = `toast ${type}`;
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

/* ========================
   INIT
   ======================== */
renderAll();
