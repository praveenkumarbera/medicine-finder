const API = 'https://medicine-finder-gvri.onrender.com/api';
let map;
let markers = [];

// ─── MAP INIT ────────────────────────────────────────────────
function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 13.0827, lng: 80.2707 },
    zoom: 13,
    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
  });
}

function showMap() {
  const mapEl = document.getElementById('map-container');
  mapEl.style.display = 'block';
  google.maps.event.trigger(map, 'resize');
}

// ─── SEARCH MEDICINE ─────────────────────────────────────────
async function searchMedicine() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const resultsSection = document.getElementById('results-section');
  const container = document.getElementById('results-container');
  const relatedSection = document.getElementById('related-section');

  container.innerHTML = '<p class="loading">Searching...</p>';
  resultsSection.style.display = 'block';
  relatedSection.style.display = 'none';

  try {
    const res = await fetch(`${API}/medicines/search?q=${encodeURIComponent(query)}`);
    const medicines = await res.json();

    if (!medicines.length) {
      container.innerHTML = '<p class="no-results">No medicines found. Try a different name.</p>';
      return;
    }

    container.innerHTML = medicines.map(m => `
      <div class="result-card">
        <div class="result-name">💊 ${m.name}</div>
        <div class="result-meta">📂 Category: ${m.category}</div>
        <div class="result-meta">ℹ️ ${m.description}</div>
        <div class="result-price">💰 Price: ₹${m.price}</div>
        <span class="${m.requiresPrescription ? 'badge-rx' : 'badge-otc'}">
          ${m.requiresPrescription ? '⚠️ Prescription Required' : '✅ No Prescription'}
        </span>
      </div>
    `).join('');

    // Show related medicines based on the first result's category
    if (medicines.length > 0) {
      loadRelatedMedicines(medicines[0].category, medicines[0].name);
    }

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    container.innerHTML = '<p class="no-results">Error fetching results. Please try again.</p>';
  }
}

// ─── RELATED MEDICINES ───────────────────────────────────────
async function loadRelatedMedicines(category, excludeName) {
  const relatedSection = document.getElementById('related-section');
  const filterRow = document.getElementById('filterRow');
  const relatedGrid = document.getElementById('relatedGrid');

  relatedSection.style.display = 'block';

  try {
    const res = await fetch(`${API}/medicines`);
    const all = await res.json();

    // Get unique categories
    const categories = ['All', ...new Set(all.map(m => m.category))];

    // Build filter pills
    filterRow.innerHTML = categories.map((cat, i) => `
      <button class="filter-pill ${i === 0 ? 'active' : ''}" 
              onclick="filterRelated('${cat}', this, ${JSON.stringify(all)}, '${excludeName}')">
        ${cat}
      </button>
    `).join('');

    // Show medicines from the same category first (excluding the searched one)
    const related = all.filter(m => m.name !== excludeName && m.category === category).slice(0, 6);
    renderRelatedCards(related);

    // Store all medicines on window for filter use
    window._allMedicines = all;
    window._excludeName = excludeName;

  } catch (err) {
    relatedSection.style.display = 'none';
  }
}

function filterRelated(cat, el, all, excludeName) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const medicines = window._allMedicines || all;
  const exclude = window._excludeName || excludeName;

  const filtered = cat === 'All'
    ? medicines.filter(m => m.name !== exclude).slice(0, 8)
    : medicines.filter(m => m.category === cat && m.name !== exclude).slice(0, 8);

  renderRelatedCards(filtered);
}

function renderRelatedCards(list) {
  const catColors = {
    'Painkiller':     { bg: '#fce8e6', color: '#c5221f' },
    'Digestive':      { bg: '#e6f4ea', color: '#137333' },
    'Vitamins':       { bg: '#e8f0fe', color: '#1a73e8' },
    'Cold & Flu':     { bg: '#fef7e0', color: '#b06000' },
    'Skin':           { bg: '#fce8f3', color: '#a8006e' },
    'Antihistamine':  { bg: '#f3e8fd', color: '#7b1fa2' },
    'Antibiotic':     { bg: '#fce8e6', color: '#b31412' },
    'Nasal':          { bg: '#e0f7fa', color: '#006064' },
    'First Aid':      { bg: '#fff3e0', color: '#e65100' },
    'Sleep':          { bg: '#ede7f6', color: '#4527a0' },
    'Cardiac':        { bg: '#fce4ec', color: '#880e4f' },
    'Diabetes':       { bg: '#e8f5e9', color: '#1b5e20' },
  };

  const grid = document.getElementById('relatedGrid');
  if (!list.length) {
    grid.innerHTML = '<p class="no-results" style="grid-column:1/-1;">No medicines in this category.</p>';
    return;
  }

  grid.innerHTML = list.map(m => {
    const c = catColors[m.category] || { bg: '#e8f0fe', color: '#1a73e8' };
    return `
      <div class="related-card" onclick="document.getElementById('searchInput').value='${m.name}'; searchMedicine();">
        <span class="cat-pill" style="background:${c.bg}; color:${c.color};">${m.category}</span>
        <div class="related-name">${m.name}</div>
        <div class="related-desc">${m.description}</div>
        <div class="related-footer">
          <span class="related-price">₹${m.price}</span>
          <span class="${m.requiresPrescription ? 'badge-rx-sm' : 'badge-otc-sm'}">
            ${m.requiresPrescription ? 'Rx' : 'OTC'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── AI SYMPTOM CHECKER ──────────────────────────────────────
async function checkSymptoms() {
  const symptom = document.getElementById('symptomInput').value.trim();
  const resultEl = document.getElementById('aiResult');

  if (!symptom) return;

  resultEl.className = 'ai-result ai-loading';
  resultEl.textContent = '🤔 Analyzing your symptoms...';
  resultEl.style.display = 'block';

  try {
    const res = await fetch(`${API}/ai/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms: symptom })
    });
    const data = await res.json();
    resultEl.className = 'ai-result ai-success';
    resultEl.innerHTML = data.suggestion || formatAISuggestion(symptom);
  } catch {
    // Fallback local suggestions
    resultEl.className = 'ai-result ai-success';
    resultEl.innerHTML = formatAISuggestion(symptom);
  }
}

function formatAISuggestion(symptom) {
  const s = symptom.toLowerCase();
  const map = [
    { keys: ['headache', 'head ache', 'head pain'],  meds: ['Dolo 650', 'Crocin', 'Combiflam'], note: 'Rest and stay hydrated.' },
    { keys: ['fever', 'temperature', 'high temp'],    meds: ['Dolo 650', 'Crocin', 'Paracetamol'], note: 'If fever exceeds 103°F, consult a doctor.' },
    { keys: ['acidity', 'acid', 'heartburn', 'gas'],  meds: ['Eno', 'Digene', 'Pan 40', 'Omeprazole'], note: 'Avoid spicy food and eat smaller meals.' },
    { keys: ['cold', 'sneezing', 'runny nose'],       meds: ['Sinarest', 'Vicks VapoRub', 'Otrivin'], note: 'Steam inhalation also helps.' },
    { keys: ['cough', 'throat'],                      meds: ['Strepsils', 'Cough Syrup'], note: 'Warm water with honey is also soothing.' },
    { keys: ['stomach', 'diarrhea', 'loose motion'],  meds: ['ORS Sachet', 'Metronidazole', 'Pudin Hara'], note: 'Keep yourself well hydrated.' },
    { keys: ['allergy', 'itching', 'rash'],           meds: ['Levocetrizine', 'Avil', 'Calamine Lotion'], note: 'Avoid the allergen if known.' },
    { keys: ['wound', 'cut', 'injury'],               meds: ['Dettol', 'Betadine', 'Soframycin'], note: 'Clean the wound before applying.' },
    { keys: ['pain', 'body ache', 'muscle'],          meds: ['Combiflam', 'Dolo 650', 'Disprin'], note: 'Consult a doctor if pain persists.' },
  ];

  for (const entry of map) {
    if (entry.keys.some(k => s.includes(k))) {
      const links = entry.meds.map(med =>
        `<a class="med-link" onclick="document.getElementById('searchInput').value='${med}'; searchMedicine();">${med}</a>`
      ).join(', ');
      return `💊 <strong>Suggested medicines:</strong> ${links}<br><small>ℹ️ ${entry.note} Always consult a doctor for proper diagnosis.</small>`;
    }
  }

  return `⚠️ Couldn't match specific symptoms. Please try keywords like <em>fever, headache, cough, acidity</em>, or consult a doctor.`;
}

// ─── NEARBY PHARMACIES ───────────────────────────────────────
function findNearbyPharmacies() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;

    try {
      const res = await fetch(`${API}/pharmacies/nearby?lat=${latitude}&lng=${longitude}`);
      const pharmacies = await res.json();

      const container = document.getElementById('pharmacies-container');
      if (!pharmacies.length) {
        container.innerHTML = '<p class="no-results">No pharmacies found nearby.</p>';
        return;
      }

      container.innerHTML = pharmacies.map(p => `
        <div class="pharmacy-card">
          <div class="pharmacy-name">🏥 ${p.name}</div>
          <div class="pharmacy-meta">📍 ${p.address}</div>
          ${p.phone ? `<div class="pharmacy-meta">📞 ${p.phone}</div>` : ''}
          <div class="pharmacy-meta">✅ Medicines in stock: ${p.medicineCount || 'N/A'}</div>
          <button class="btn-show-map" onclick="showPharmacyOnMap(${p.lat}, ${p.lng}, '${p.name}')">
            🗺 Show on Map
          </button>
        </div>
      `).join('');

      // Update map center
      if (map && pharmacies[0]) {
        map.setCenter({ lat: pharmacies[0].lat, lng: pharmacies[0].lng });
        showMap();
        pharmacies.forEach(p => addMarker(p.lat, p.lng, p.name));
      }

    } catch (err) {
      document.getElementById('pharmacies-container').innerHTML =
        '<p class="no-results">Could not load pharmacies. Try again.</p>';
    }
  }, () => {
    alert('Unable to get your location. Please allow location access.');
  });
}

function addMarker(lat, lng, title) {
  if (!map) return;
  const marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    title,
    icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
  });
  markers.push(marker);
}

function showPharmacyOnMap(lat, lng, name) {
  showMap();
  map.setCenter({ lat, lng });
  map.setZoom(16);
  document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
}

// ─── ENTER KEY SUPPORT ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchMedicine();
  });
  document.getElementById('symptomInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkSymptoms();
  });
});
