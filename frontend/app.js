const API = 'https://medicine-finder-production.up.railway.app/api';
let map, markers = [], userLocation = null, infoWindow = null;

function renderMedicines(medicines, container) {
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
}

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
    const res = await fetch(`${API}/medicines/search?name=${encodeURIComponent(query)}`);
    const medicines = await res.json();
    if (!medicines.length) {
      container.innerHTML = '<p class="no-results">No medicines found. Try a different name.</p>';
      return;
    }
    renderMedicines(medicines, container);
    if (medicines[0]) loadRelatedMedicines(medicines[0].category, medicines[0].name);
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  } catch(err) {
    container.innerHTML = `<p class="no-results">Error: ${err.message}</p>`;
  }
}

async function filterByCategory(cat, el) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const resultsSection = document.getElementById('results-section');
  const container = document.getElementById('results-container');
  const relatedSection = document.getElementById('related-section');
  container.innerHTML = '<p class="loading">Loading...</p>';
  resultsSection.style.display = 'block';
  relatedSection.style.display = 'none';
  try {
    const url = cat === 'All'
      ? `${API}/medicines`
      : `${API}/medicines/category?cat=${encodeURIComponent(cat)}`;
    const res = await fetch(url);
    const medicines = await res.json();
    if (!medicines || !medicines.length) {
      container.innerHTML = '<p class="no-results">No medicines in this category.</p>';
      return;
    }
    renderMedicines(medicines, container);
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  } catch(err) {
    container.innerHTML = `<p class="no-results">Error: ${err.message}</p>`;
  }
}

async function loadRelatedMedicines(category, excludeName) {
  const relatedSection = document.getElementById('related-section');
  const filterRow = document.getElementById('filterRow');
  relatedSection.style.display = 'block';
  try {
    const res = await fetch(`${API}/medicines`);
    const all = await res.json();
    const categories = ['All', ...new Set(all.map(m => m.category))];
    filterRow.innerHTML = categories.map(c => `
      <button class="filter-pill ${c === category ? 'active' : ''}" onclick="filterRelated('${c}', this)">
        ${c}
      </button>
    `).join('');
    window._allMedicines = all;
    window._excludeName = excludeName;
    const related = all.filter(m => m.name !== excludeName && m.category === category).slice(0, 6);
    renderRelatedCards(related);
  } catch(err) {
    relatedSection.style.display = 'none';
  }
}

function filterRelated(cat, el) {
  document.querySelectorAll('#filterRow .filter-pill').forEach(p => p.classList.remove('active'));
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
    'First Aid':     { bg: '#fff3e0', color: '#e65100' },
    'Cardiac':       { bg: '#fce4ec', color: '#880e4f' },
    'Diabetes':      { bg: '#e8f5e9', color: '#1b5e20' },
    'Sleep':         { bg: '#ede7f6', color: '#4527a0' },
  };
  const grid = document.getElementById('relatedGrid');
  if (!list.length) { grid.innerHTML = '<p class="no-results">No medicines in this category.</p>'; return; }
  grid.innerHTML = list.map(m => {
    const c = catColors[m.category] || { bg: '#e8f0fe', color: '#1a73e8' };
    return `
      <div class="related-card" onclick="document.getElementById('searchInput').value='${m.name}'; searchMedicine();">
        <span class="cat-pill" style="background:${c.bg};color:${c.color};">${m.category}</span>
        <div class="related-name">${m.name}</div>
        <div class="related-desc">${m.description}</div>
        <div class="related-footer">
          <span class="related-price">₹${m.price}</span>
          <span class="${m.requiresPrescription ? 'badge-rx-sm' : 'badge-otc-sm'}">${m.requiresPrescription ? 'Rx' : 'OTC'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 13.0827, lng: 80.2707 }, zoom: 13
  });
  infoWindow = new google.maps.InfoWindow();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(userLocation);
      new google.maps.Marker({
        position: userLocation, map,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1a73e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
      });
    }, () => {});
  }
}

function findNearbyPharmacies() {
  const btn = document.getElementById('findPharmBtn');
  btn.textContent = '📍 Getting location...';
  btn.disabled = true;
  const fallback = { lat: 13.0827, lng: 80.2707 };
  if (!navigator.geolocation) {
    loadPharmacies(fallback);
    btn.textContent = '📍 Show Nearby Pharmacies'; btn.disabled = false; return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (map) map.setCenter(userLocation);
    loadPharmacies(userLocation);
    btn.textContent = '📍 Refresh Pharmacies'; btn.disabled = false;
  }, () => {
    loadPharmacies(fallback);
    btn.textContent = '📍 Show Nearby Pharmacies'; btn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 8000 });
}

function loadPharmacies(location) {
  const container = document.getElementById('pharmacies-container');
  container.innerHTML = '<p class="loading">🔍 Finding pharmacies...</p>';
  markers.forEach(m => m.setMap(null)); markers = [];
  const { lat, lng } = location;
  fetch(`${API}/pharmacy/nearby?lat=${lat}&lng=${lng}`)
  .then(r => r.json())
  .then(pharmacies => {
    if (!pharmacies.length) { container.innerHTML = '<p class="no-results">No pharmacies found.</p>'; return; }
    container.innerHTML = pharmacies.slice(0,10).map((p,i) => {
      const dist = p.distance < 1 ? `${Math.round(p.distance*1000)}m` : `${p.distance.toFixed(1)}km`;
      return `<div class="pharmacy-card">
        <div class="pharmacy-name">🏥 ${p.name}</div>
        <div class="pharmacy-meta">📍 ${p.address}</div>
        ${p.phone ? `<div class="pharmacy-meta">📞 ${p.phone}</div>` : ''}
        <div class="pharmacy-meta" style="color:#1a73e8;font-weight:500;">📏 ${dist} away</div>
        <button class="btn-show-map" onclick="focusPharmacyOnMap(${p.lat},${p.lng},'${p.name.replace(/'/g,"\\'")}',${i})">
          🗺 Show on Map
        </button>
      </div>`;
    }).join('');
    if (map) {
      pharmacies.slice(0,10).forEach((p,i) => {
        const marker = new google.maps.Marker({
          position:{lat:p.lat,lng:p.lng}, map, title:p.name,
          icon:{url:'https://maps.google.com/mapfiles/ms/icons/red-dot.png'},
          animation: google.maps.Animation.DROP
        });
        marker.addListener('click', () => {
          const dist = p.distance < 1 ? `${Math.round(p.distance*1000)}m` : `${p.distance.toFixed(1)}km`;
          infoWindow.setContent(`<div style="font-family:Poppins,sans-serif;padding:4px;max-width:200px">
            <strong>${p.name}</strong>
            <div style="font-size:12px;color:#555;margin-top:4px">📍 ${p.address}</div>
            ${p.phone?`<div style="font-size:12px">📞 ${p.phone}</div>`:''}
            <div style="font-size:12px;color:#1a73e8;margin-top:4px">📏 ${dist} away</div>
          </div>`);
          infoWindow.open(map, marker);
        });
        markers.push(marker);
      });
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m.getPosition()));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds);
    }
  })
  .catch(err => { container.innerHTML = `<p class="no-results">❌ ${err.message}</p>`; });
}

function focusPharmacyOnMap(lat, lng, name, i) {
  if (map) { map.setCenter({lat,lng}); map.setZoom(17); }
  if (markers[i]) google.maps.event.trigger(markers[i], 'click');
  document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
}

async function checkSymptoms() {
  const symptom = document.getElementById('symptomInput').value.trim();
  const resultEl = document.getElementById('aiResult');
  if (!symptom) return;
  resultEl.style.display = 'block';
  resultEl.innerHTML = '🤔 Analyzing your symptoms...';
  try {
    const res = await fetch(`${API}/ai/recommend`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({symptoms: symptom})
    });
    const data = await res.json();
    resultEl.innerHTML = data.error ? `❌ ${data.error}` : data.recommendation;
  } catch(err) {
    resultEl.innerHTML = formatAISuggestion(symptom);
  }
}

function formatAISuggestion(symptom) {
  const s = symptom.toLowerCase();
  const map = [
    { keys:['headache','head ache'],  meds:['Dolo 650','Crocin','Saridon'],        note:'Rest and stay hydrated.' },
    { keys:['fever','temperature'],    meds:['Dolo 650','Crocin','Paracetamol'],    note:'If above 103°F, see a doctor.' },
    { keys:['acidity','acid','gas'],   meds:['Eno','Digene','Pan 40'],              note:'Avoid spicy food.' },
    { keys:['cold','sneezing'],        meds:['Sinarest','Vicks VapoRub','Cetrizine'], note:'Steam inhalation helps.' },
    { keys:['cough','throat'],         meds:['Strepsils','Benadryl'],               note:'Warm water with honey soothes.' },
    { keys:['stomach','diarrhea'],     meds:['ORS Sachet','Loperamide'],            note:'Keep well hydrated.' },
    { keys:['allergy','itching'],      meds:['Levocetrizine','Avil'],               note:'Avoid the allergen.' },
    { keys:['pain','body ache'],       meds:['Combiflam','Dolo 650'],               note:'Consult if pain persists.' },
  ];
  for (const entry of map) {
    if (entry.keys.some(k => s.includes(k))) {
      const links = entry.meds.map(med =>
        `<a style="color:#1a73e8;cursor:pointer;font-weight:600;" onclick="document.getElementById('searchInput').value='${med}';searchMedicine();">${med}</a>`
      ).join(', ');
      return `💊 <strong>Suggested:</strong> ${links}<br><small>ℹ️ ${entry.note} Always consult a doctor.</small>`;
    }
  }
  return `⚠️ Try: <em>fever, headache, cold, acidity</em> — or consult a doctor.`;
}

function getDistKm(lat1,lng1,lat2,lng2) {
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchMedicine();
  });
  document.getElementById('symptomInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkSymptoms();
  });
});
