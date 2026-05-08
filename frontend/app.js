const API = 'http://localhost:3000/api';
let map;
let markers = [];

// Initialize Google Map
function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 13.0827, lng: 80.2707 }, // Chennai
    zoom: 12,
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] }
    ]
  });
}

// Load map with pharmacy markers
async function loadMap() {
  document.getElementById('map-container').scrollIntoView({ behavior: 'smooth' });

  try {
    const res = await fetch(`${API}/pharmacies`);
    const pharmacies = await res.json();

    // Clear old markers
    markers.forEach(m => m.setMap(null));
    markers = [];

    pharmacies.forEach(p => {
      if (p.location && p.location.lat) {
        const marker = new google.maps.Marker({
          position: { lat: p.location.lat, lng: p.location.lng },
          map: map,
          title: p.name,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family:Poppins,sans-serif;padding:8px;">
              <h3 style="color:#1a73e8;margin:0 0 6px">🏪 ${p.name}</h3>
              <p style="margin:0 0 4px">📍 ${p.address}</p>
              <p style="margin:0 0 4px">📞 ${p.phone || 'N/A'}</p>
              <p style="margin:0;color:#2e7d32;font-weight:600">
                ✅ ${p.inventory.filter(i => i.inStock).length} medicines in stock
              </p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markers.push(marker);
      }
    });

    // Fit map to markers
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend(m.getPosition()));
      map.fitBounds(bounds);
    }

  } catch (err) {
    console.error('Map error:', err);
  }
}

// Search medicine
async function searchMedicine() {
  const input = document.getElementById('medicineInput');
  const name = input.value.trim();

  if (!name) {
    alert('Please enter a medicine name!');
    return;
  }

  const container = document.getElementById('searchResults');
  container.innerHTML = '<p>Searching...</p>';

  try {
    const res = await fetch(`${API}/medicines/search?name=${encodeURIComponent(name)}`);
    const medicines = await res.json();

    if (medicines.length === 0) {
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

// Load pharmacies
async function loadPharmacies() {
  const container = document.getElementById('pharmacyList');
  container.innerHTML = '<p>Loading...</p>';

  try {
    const res = await fetch(`${API}/pharmacies`);
    const pharmacies = await res.json();

    if (pharmacies.length === 0) {
      container.innerHTML = '<p class="placeholder">No pharmacies found.</p>';
      return;
    }

    container.innerHTML = pharmacies.map(p => `
      <div class="card">
        <h3>🏪 ${p.name}</h3>
        <p>📍 ${p.address}</p>
        <p>📞 ${p.phone || 'N/A'}</p>
        <p>🧪 Medicines in stock: ${p.inventory.filter(i => i.inStock).length}</p>
        <button class="btn-outline" style="margin-top:10px;padding:8px 16px;font-size:0.85rem"
          onclick="showOnMap(${p.location.lat}, ${p.location.lng}, '${p.name}')">
          🗺️ Show on Map
        </button>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:red">❌ Error: ${err.message}</p>`;
  }
}

// Show specific pharmacy on map
function showOnMap(lat, lng, name) {
  document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
  map.setCenter({ lat, lng });
  map.setZoom(15);

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: map,
    title: name,
    animation: google.maps.Animation.BOUNCE
  });
  markers.push(marker);
  setTimeout(() => marker.setAnimation(null), 2000);
}

// Emergency request
function sendEmergency() {
  const medicine = document.getElementById('emergencyMedicine').value.trim();
  const name = document.getElementById('emergencyName').value.trim();
  const phone = document.getElementById('emergencyPhone').value.trim();

  if (!medicine || !name || !phone) {
    alert('Please fill all fields!');
    return;
  }

  document.getElementById('emergencyMsg').innerHTML =
    `✅ Emergency request sent for <strong>${medicine}</strong>! Nearby pharmacies have been notified.`;

  document.getElementById('emergencyMedicine').value = '';
  document.getElementById('emergencyName').value = '';
  document.getElementById('emergencyPhone').value = '';
}

// Search on Enter key
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('medicineInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMedicine();
  });
});
// AUTH FUNCTIONS
function showLogin() {
  closeModals();
  document.getElementById('loginModal').style.display = 'flex';
}

function showRegister() {
  closeModals();
  document.getElementById('registerModal').style.display = 'flex';
}

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

  if (!email || !password) {
    document.getElementById('loginMsg').textContent = 'Please fill all fields!';
    return;
  }

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

// Check login on page load
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  document.getElementById('medicineInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMedicine();
  });
});