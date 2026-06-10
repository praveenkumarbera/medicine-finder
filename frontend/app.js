const API = 'https://medicine-finder-gvri.onrender.com/api';
let map;
let markers = [];
let userLocation = null;
let infoWindow = null;

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

function findNearbyPharmacies() {
  const btn = document.getElementById('findPharmBtn');
  if (!navigator.geolocation) {
    document.getElementById('pharmacyList').innerHTML =
      '<p style="color:red">Geolocation not supported.</p>';
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
    document.getElementById('pharmacyList').innerHTML =
      '<p style="color:red">⚠️ Location access denied. Please allow location in browser settings.</p>';
    btn.textContent = '📍 Show Nearby Pharmacies';
    btn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function fetchNearbyPharmacies(location) {
  const container = document.getElementById('pharmacyList');
  container.innerHTML = '<p>🔍 Finding pharmacies near you...</p>';
  markers.forEach(m => m.setMap(null));
  markers = [];

  const { lat, lng } = location;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="pharmacy"](around:2000,${lat},${lng});
      node["shop"="chemist"](around:2000,${lat},${lng});
    );
    out body;
  `;

  fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  })
  .then(res => res.json())
  .then(data => {
    if (!data.elements || !data.elements.length) {
      container.innerHTML = '<p class="placeholder">No pharmacies found nearby.</p>';
      return;
    }

    const pharmacies = data.elements
      .filter(p => p.lat && p.lon)
      .map(p => ({
        name: p.tags.name || 'Medical Store',
        address: [p.tags['addr:street'], p.tags['addr:city']].filter(Boolean).join(', ') || 'Address not available',
        phone: p.tags.phone || p.tags['contact:phone'] || '',
        opening_hours: p.tags.opening_hours || '',
        lat: p.lat,
        lng: p.lon,
        distance: getDistanceKm(lat, lng, p.lat, p.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    container.innerHTML = pharmacies.map((p, i) => {
      const dist = p.distance < 1
        ? `${Math.round(p.distance * 1000)}m away`
        : `${p.distance.toFixed(1)}km away`;
      return `
        <div class="card">
          <h3>🏪 ${p.name}</h3>
          <p>📍 ${p.address}</p>
          ${p.phone ? `<p>📞 ${p.phone}</p>` : ''}
          ${p.opening_hours ? `<p>🕐 ${p.opening_hours}</p>` : ''}
          <p style="color:#1a73e8;font-weight:600;">📏 ${dist}</p>
          <button class="btn-outline" style="margin-top:10px;padding:8px 16px;font-size:0.85rem"
            onclick="focusPharmacyOnMap(${p.lat}, ${p.lng}, '${p.name.replace(/'/g,"\\'")}', ${i})">
            🗺️ Show on Map
          </button>
        </div>
      `;
    }).join('');

    pharmacies.forEach((p, i) => addPharmacyMarker(p, i));
    showMap();
  })
  .catch(() => {
    container.innerHTML = '<p style="color:red">Could not load pharmacies. Check internet and try again.</p>';
  });
}

function addPharmacyMarker(pharmacy, index) {
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
        ${pharmacy.phone ? `<div style="font-size:12px;">📞 ${pharmacy.phone}</div>` : ''}
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
  document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function searchMedicine() {
  const input = document.getElementById('medicineInput');
  const name = input.value.trim();
  if (!name) { alert('Please enter a medicine name!'); return; }

  const container = document.getElementById('searchResults');
  container.innerHTML = '<p>Searching...</p>';

  try {
    const res = await fetch(`${API}/medicines/search?name=${encodeURIComponent(name)}`);
    const medicines = await res.json();

    if (!medicines.length) {
      container.innerHTML = '<p class="placeholder">No medicines found.</p>';
      return;
    }

    container.innerHTML = medicines.map(m => `
      <div class="card">
        <h3>💊 ${m.name}</h3>
        <p>📁 Category: ${m.category || 'General'}</p>
        <p>📝 ${m.description || 'No description'}</p>
        <p>💰 Price: ₹${m.price || 'N/A'}</p>
        <span class="badge ${m.requiresPrescription ? 'outstock' : 'instock'}">
          ${m.requiresPrescription ? '📋 Prescription Required' : '✅ No Prescription'}
        </span>
      </div>
    `).join('');

    document.getElementById('search').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    container.innerHTML = `<p style="color:red">❌ Error: ${err.message}</p>`;
  }
}

async function getAIRecommendation() {
  const symptoms = document.getElementById('symptomsInput').value.trim();
  if (!symptoms) { alert('Please describe your symptoms!'); return; }

  const resultDiv = document.getElementById('aiResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '🤖 AI is analyzing your symptoms...';

  try {
    const res = await fetch(`${API}/ai/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms })
    });
    const data = await res.json();
    if (data.error) {
      resultDiv.innerHTML = `❌ Error: ${data.error}`;
    } else {
      resultDiv.innerHTML = `<strong>🤖 AI Recommendation:</strong>\n\n${data.recommendation}`;
    }
  } catch (err) {
    resultDiv.innerHTML = `❌ Error: ${err.message}`;
  }
}

function sendEmergency() {
  const medicine = document.getElementById('emergencyMedicine').value.trim();
  const name = document.getElementById('emergencyName').value.trim();
  const phone = document.getElementById('emergencyPhone').value.trim();
  if (!medicine || !name || !phone) { alert('Please fill all fields!'); return; }
  document.getElementById('emergencyMsg').innerHTML =
    `✅ Emergency request sent for <strong>${medicine}</strong>! Nearby pharmacies notified.`;
  document.getElementById('emergencyMedicine').value = '';
  document.getElementById('emergencyName').value = '';
  document.getElementById('emergencyPhone').value = '';
}

function showLogin() { closeModals(); document.getElementById('loginModal').style.display = 'flex'; }
function showRegister() { closeModals(); document.getElementById('registerModal').style.display = 'flex'; }
function closeModals() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('registerModal').style.display = 'none';
}

async function register() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const role = document.getElementById('regRole').value;
  if (!name || !email || !password) {
    document.getElementById('registerMsg').style.color = 'red';
    document.getElementById('registerMsg').textContent = 'Please fill all fields!';
    return;
  }
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('registerMsg').style.color = 'red';
      document.getElementById('registerMsg').textContent = data.error;
    } else {
      document.getElementById('registerMsg').style.color = 'green';
      document.getElementById('registerMsg').textContent = data.message;
      setTimeout(() => showLogin(), 1500);
    }
  } catch (err) {
    document.getElementById('registerMsg').textContent = 'Error: ' + err.message;
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!email || !password) { document.getElementById('loginMsg').textContent = 'Please fill all fields!'; return; }
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.error) {
      document.getElementById('loginMsg').textContent = data.error;
    } else {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.user.name);
      closeModals();
      updateAuthUI();
    }
  } catch (err) {
    document.getElementById('loginMsg').textContent = 'Error: ' + err.message;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  updateAuthUI();
}

function updateAuthUI() {
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('userName');
  if (token) {
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userInfo').style.alignItems = 'center';
    document.getElementById('userName').textContent = `👋 ${name}`;
  } else {
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('userInfo').style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  document.getElementById('medicineInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') searchMedicine();
  });
});