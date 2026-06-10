const API = 'https://medicine-finder-gvri.onrender.com/api';
let map;
let markers = [];
let userLocation = null;
let infoWindow = null;

// ─── MAP INIT ────────────────────────────────────────────────
function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 13.0827, lng: 80.2707 },
    zoom: 14,
    styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
  });
  infoWindow = new google.maps.InfoWindow();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(userLocation);
      addUserMarker(userLocation);
      fetchNearbyPharmacies(userLocation);
    }, () => {});
  }
}

function showMap() {
  const mapEl = document.getElementById('map-container');
  mapEl.style.display = 'block';
  google.maps.event.trigger(map, 'resize');
  if (userLocation) map.setCenter(userLocation);
}

function addUserMarker(location) {
  new google.maps.Marker({
    position: location,
    map,
    title: 'Your location',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#1a73e8',
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2
    },
    zIndex: 999
  });
}

// ─── FIND NEARBY PHARMACIES ──────────────────────────────────
function findNearbyPharmacies() {
  const btn = document.getElementById('findPharmBtn');
  if (!navigator.geolocation) {
    document.getElementById('pharmacies-container').innerHTML =
      '<p class="no-results">Geolocation not supported by your browser.</p>';
    return;
  }
  btn.textContent = '📍 Getting your location...';
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    map.setCenter(userLocation);
    addUserMarker(userLocation);
    showMap();
    fetchNearbyPharmacies(userLocation);
    btn.textContent = '📍 Refresh Pharmacies';
    btn.disabled = false;
  }, () => {
    document.getElementById('pharmacies-container').innerHTML =
      '<p class="no-results">⚠️ Location access denied. Please allow location in browser settings.</p>';
    btn.textContent = '📍 Show Nearby Pharmacies';
    btn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function fetchNearbyPharmacies(location) {
  const container = document.getElementById('pharmacies-container');
  container.innerHTML = '<p class="loading">🔍 Finding pharmacies near you...</p>';
  markers.forEach(m => m.setMap(null));
  markers = [];

  fetch(`${API}/pharmacy/nearby?lat=${location.lat}&lng=${location.lng}`)
    .then(res => res.json())
    .then(pharmacies => {
      if (!pharmacies.length) {
        container.innerHTML = '<p class="no-results">No pharmacies found nearby.</p>';
        return;
      }
      renderPharmacyCards(pharmacies);
      pharmacies.forEach(p => addPharmacyMarker(p));
      showMap();
    })
    .catch(() => {
      container.innerHTML = '<p class="no-results">Could not load pharmacies. Try again.</p>';
    });
}

function renderPharmacyCards(pharmacies) {
  const container = document.getElementById('pharmacies-container');
  container.innerHTML = pharmacies.map((p, i) => {
    const dist = p.distance < 1
      ? `${Math.round(p.distance * 1000)}m away`
      : `${p.distance.toFixed(1)}km away`;
    return `
      <div class="pharmacy-card">
        <div class="pharmacy-name">🏥 ${p.name}</div>
        <div class="pharmacy-meta">📍 ${p.address}</div>
        ${p.phone ? `<div class="pharmacy-meta">📞 ${p.phone}</div>` : ''}
        <div class="pharmacy-meta" style="color:#1a73e8;font-weight:500;margin-top:4px;">📏 ${dist}</div>
        <button class="btn-show-map" onclick="focusPharmacyOnMap(${p.lat}, ${p.lng}, '${p.name.replace(/'/g,"\\'")}', ${i})">
          🗺 Show on Map
        </button>
      </div>
    `;
  }).join('');
}

function addPharmacyMarker(pharmacy) {
  const marker = new google.maps.Marker({
    position: { lat: pharmacy.lat, lng: pharmacy.lng },
    map,
    title: pharmacy.name,
    icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
    animation: google.maps.Animation.DROP
  });
  marker.addListener('click', () => {
    const dist = pharmacy.distance < 1
      ? `${Math.round(pharmacy.distance * 1000)}m away`
      : `${pharmacy.distance.toFixed(1)}km away`;
    infoWindow.setContent(`
      <div style="font-family:Poppins,sans-serif;padding:4px;max-width:220px;">
        <strong>${pharmacy.name}</strong>
        <div style="font-size:12px;color:#555;margin-top:4px;">📍 ${pharmacy.address}</div>
        ${pharmacy.phone ? `<div style="font-size:12px;margin-top:4px;">📞 ${pharmacy.phone}</div>` : ''}
        <div style="font-size:12px;color:#1a73e8;margin-top:4px;">📏 ${dist}</div>
      </div>
    `);
    infoWindow.open(map, marker);
  });
  markers.push(marker);
}

function focusPharmacyOnMap(lat, lng, name, index) {
  showMap();
  map.setCenter({ lat, lng });
  map.setZoom(17);
  if (markers[index]) google.maps.event.trigger(markers[index], 'click');
  document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    if (!res.ok) throw new Error('Server error');
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

    loadRelatedMedicines(medicines[0].category, medicines[0].name);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    container.innerHTML = `<p class="no-results">Error fetching results. Please try again.</p>`;
  }
}

// ─── RELATED MEDICINES BY CATEGORY ───────────────────────────
async function loadRelatedMedicines(category, excludeName) {
  const relatedSection = document.getElementById('related-section');
  const filterRow = document.getElementById('filterRow');
  relatedSection.style.display = 'block';

  try {
    const res = await fetch(`${API}/medicines`);
    if (!res.ok) throw new Error('Server error');
    const all = await res.json();

    const categories = ['All', ...new Set(all.map(m => m.category))];
    filterRow.innerHTML = categories.map(cat => `
      <button class="filter-pill ${cat === category ? 'active' : ''}"
              onclick="filterRelated('${cat}', this)">
        ${cat}
      </button>
    `).join('');

    window._allMedicines = all;
    window._excludeName = excludeName;

    const related = all.filter(m => m.name !== excludeName && m.category === category).slice(0, 6);
    renderRelatedCards(related);

  } catch (err) {
    relatedSection.style.display = 'none';
  }
}

function filterRelated(cat, el) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const medicines = window._allMedicines || [];
  const exclude = window._excludeName || '';
  const filtered = cat === 'All'
    ? medicines.filter(m => m.name !== exclude).slice(0, 8)
    : medicines.filter(m => m.category === cat && m.name !== exclude).slice(0, 8);
  renderRelatedCards(filtered);
}

function renderRelatedCards(list) {
  const catColors = {
    'Painkiller':    { bg: '#fce8e6', color: '#c5221f' },
    'Digestive':     { bg: '#e6f4ea', color: '#137333' },
    'Vitamins':      { bg: '#e8f0fe', color: '#1a73e8' },
    'Cold & Flu':    { bg: '#fef7e0', color: '#b06000' },
    'Skin':          { bg: '#fce8f3', color: '#a8006e' },
    'Antihistamine': { bg: '#f3e8fd', color: '#7b1fa2' },
    'Antibiotic':    { bg: '#fce8e6', color: '#b31412' },
    'Nasal':         { bg: '#e0f7fa', color: '#006064' },
    'First Aid':     { bg: '#fff3e0', color: '#e65100' },
    'Sleep':         { bg: '#ede7f6', color: '#4527a0' },
    'Cardiac':       { bg: '#fce4ec', color: '#880e4f' },
    'Diabetes':      { bg: '#e8f5e9', color: '#1b5e20' },
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
        <span class="cat-pill" style="background:${c.bg};color:${c.color};">${m.category}</span>
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
    resultEl.className = 'ai-result ai-success';
    resultEl.innerHTML = formatAISuggestion(symptom);
  }
}

function formatAISuggestion(symptom) {
  const s = symptom.toLowerCase();
  const map = [
    { keys: ['headache','head ache','head pain'],   meds: ['Dolo 650','Crocin','Combiflam'],           note: 'Rest and stay hydrated.' },
    { keys: ['fever','temperature','high temp'],    meds: ['Dolo 650','Crocin','Paracetamol'],          note: 'If fever exceeds 103°F, consult a doctor.' },
    { keys: ['acidity','acid','heartburn','gas'],   meds: ['Eno','Digene','Pan 40','Omeprazole'],       note: 'Avoid spicy food and eat smaller meals.' },
    { keys: ['cold','sneezing','runny nose'],       meds: ['Sinarest','Vicks VapoRub','Otrivin'],       note: 'Steam inhalation also helps.' },
    { keys: ['cough','throat'],                     meds: ['Strepsils','Cough Syrup'],                  note: 'Warm water with honey is also soothing.' },
    { keys: ['stomach','diarrhea','loose motion'],  meds: ['ORS Sachet','Metronidazole','Pudin Hara'],  note: 'Keep yourself well hydrated.' },
    { keys: ['allergy','itching','rash'],           meds: ['Levocetrizine','Avil','Calamine Lotion'],   note: 'Avoid the allergen if known.' },
    { keys: ['wound','cut','injury'],               meds: ['Dettol','Betadine','Soframycin'],           note: 'Clean the wound before applying.' },
    { keys: ['pain','body ache','muscle'],          meds: ['Combiflam','Dolo 650','Disprin'],           note: 'Consult a doctor if pain persists.' },
  ];

  for (const entry of map) {
    if (entry.keys.some(k => s.includes(k))) {
      const links = entry.meds.map(med =>
        `<a class="med-link" style="cursor:pointer;color:#1a73e8;" onclick="document.getElementById('searchInput').value='${med}';searchMedicine();">${med}</a>`
      ).join(', ');
      return `💊 <strong>Suggested medicines:</strong> ${links}<br><small>ℹ️ ${entry.note} Always consult a doctor for proper diagnosis.</small>`;
    }
  }
  return `⚠️ Couldn't match symptoms. Try: <em>fever, headache, cough, acidity</em>.`;
}

// ─── ENTER KEY ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchMedicine();
  });
  document.getElementById('symptomInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkSymptoms();
  });
});
