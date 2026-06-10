const API = 'https://medicine-finder-gvri.onrender.com/api';
let map, markers = [], userLocation = null, infoWindow = null;
let allMedicines = [];

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

async function filterCategory(cat) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  const container = document.getElementById('searchResults');
  container.innerHTML = '<p>Loading...</p>';
  try {
    const url = cat === 'all' ? `${API}/medicines/search?name=` : `${API}/medicines/search?name=${encodeURIComponent(cat)}`;
    const res = await fetch(`${API}/medicines/category?cat=${encodeURIComponent(cat)}`);
    const medicines = cat === 'all' ? allMedicines : await res.json();
    if (!medicines || !medicines.length) {
      container.innerHTML = '<p class="placeholder-text">No medicines found in this category.</p>';
      return;
    }
    renderMedicines(medicines, container);
    document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
  } catch(err) {
    container.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

function renderMedicines(medicines, container) {
  container.innerHTML = medicines.map(m => `
    <div class="card">
      <span class="card-category">${m.category || 'General'}</span>
      <h3>💊 ${m.name}</h3>
      <p>${m.description || 'No description'}</p>
      <p class="price">₹${m.price || 'N/A'}</p>
      <span class="badge ${m.requiresPrescription ? 'outstock' : 'instock'}">
        ${m.requiresPrescription ? '📋 Prescription Required' : '✅ No Prescription'}
      </span>
    </div>
  `).join('');
}

function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {
    center: { lat: 13.0827, lng: 80.2707 }, zoom: 14
  });
  infoWindow = new google.maps.InfoWindow();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(userLocation);
      new google.maps.Marker({ position: userLocation, map, title: 'You',
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1a73e8', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 }
      });
    }, () => {});
  }
}

function showMap() {
  const el = document.getElementById('map-container');
  el.style.display = 'block';
  google.maps.event.trigger(map, 'resize');
  if (userLocation) map.setCenter(userLocation);
}

function findNearbyPharmacies() {
  const btn = document.getElementById('findPharmBtn');
  if (!navigator.geolocation) { document.getElementById('pharmacyList').innerHTML = '<p style="color:red">Geolocation not supported.</p>'; return; }
  btn.textContent = '📍 Getting location...';
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(pos => {
    userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    map.setCenter(userLocation);
    showMap();
    fetchNearbyPharmacies(userLocation);
    btn.textContent = '📍 Refresh Pharmacies';
    btn.disabled = false;
  }, () => {
    document.getElementById('pharmacyList').innerHTML = '<p style="color:red">⚠️ Location access denied.</p>';
    btn.textContent = '📍 Show Nearby Pharmacies';
    btn.disabled = false;
  }, { enableHighAccuracy: true, timeout: 10000 });
}

function fetchNearbyPharmacies(location) {
  const container = document.getElementById('pharmacyList');
  container.innerHTML = '<p>🔍 Finding pharmacies near you...</p>';
  markers.forEach(m => m.setMap(null)); markers = [];
  const { lat, lng } = location;

  fetch(`${API}/pharmacies/nearby?lat=${lat}&lng=${lng}`)
  .then(r => r.json())
  .then(data => {
    if (!data.length) { container.innerHTML = '<p class="placeholder-text">No pharmacies found nearby.</p>'; return; }

    const pharmacies = data
      .map(p => ({ ...p, distance: getDistKm(lat, lng, p.lat, p.lng) }))
      .sort((a,b) => a.distance - b.distance)
      .slice(0, 10);

    container.innerHTML = pharmacies.map((p,i) => {
      const dist = p.distance < 1 ? `${Math.round(p.distance*1000)}m away` : `${p.distance.toFixed(1)}km away`;
      return `<div class="card">
        <h3>🏪 ${p.name}</h3>
        <p>📍 ${p.address}</p>
        ${p.phone ? `<p>📞 ${p.phone}</p>` : ''}
        <p style="color:var(--blue);font-weight:600">📏 ${dist}</p>
        <button class="btn-outline" style="margin-top:10px;padding:8px 16px;font-size:0.85rem"
          onclick="focusMap(${p.lat},${p.lng},'${p.name.replace(/'/g,"\\'")}',${i})">
          🗺️ Show on Map
        </button>
      </div>`;
    }).join('');

    pharmacies.forEach((p,i) => {
      const marker = new google.maps.Marker({
        position:{lat:p.lat,lng:p.lng}, map, title:p.name,
        icon:{url:'https://maps.google.com/mapfiles/ms/icons/red-dot.png'}
      });
      marker.addListener('click', () => {
        const dist = p.distance < 1 ? `${Math.round(p.distance*1000)}m away` : `${p.distance.toFixed(1)}km away`;
        infoWindow.setContent(`<div style="font-family:Inter,sans-serif;padding:4px;max-width:200px">
          <strong>${p.name}</strong>
          <div style="font-size:12px;color:#555;margin-top:4px">📍 ${p.address}</div>
          ${p.phone ? `<div style="font-size:12px">📞 ${p.phone}</div>` : ''}
          <div style="font-size:12px;color:#1a73e8;margin-top:4px">📏 ${dist}</div>
        </div>`);
        infoWindow.open(map, marker);
      });
      markers.push(marker);
    });
    showMap();
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => bounds.extend(m.getPosition()));
    if (userLocation) bounds.extend(userLocation);
    map.fitBounds(bounds);
  })
  .catch(err => { container.innerHTML = `<p style="color:red">❌ ${err.message}</p>`; });
}

function focusMap(lat, lng, name, i) {
  showMap(); map.setCenter({lat,lng}); map.setZoom(17);
  if (markers[i]) google.maps.event.trigger(markers[i], 'click');
  document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
}

function getDistKm(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function searchMedicine() {
  const name = document.getElementById('medicineInput').value.trim();
  if (!name) { alert('Please enter a medicine name!'); return; }
  const container = document.getElementById('searchResults');
  container.innerHTML = '<p>Searching...</p>';
  try {
    const res = await fetch(`${API}/medicines/search?name=${encodeURIComponent(name)}`);
    const medicines = await res.json();
    if (!medicines.length) { container.innerHTML = '<p class="placeholder-text">No medicines found.</p>'; return; }
    renderMedicines(medicines, container);
    document.getElementById('search').scrollIntoView({ behavior: 'smooth' });
  } catch(err) { container.innerHTML = `<p style="color:red">❌ ${err.message}</p>`; }
}

async function getAIRecommendation() {
  const symptoms = document.getElementById('symptomsInput').value.trim();
  if (!symptoms) { alert('Please describe your symptoms!'); return; }
  const resultDiv = document.getElementById('aiResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '🤖 Analyzing your symptoms...';
  try {
    const res = await fetch(`${API}/ai/recommend`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({symptoms}) });
    const data = await res.json();
    resultDiv.innerHTML = data.error ? `❌ ${data.error}` : `<strong>🤖 AI Recommendation:</strong>\n\n${data.recommendation}`;
  } catch(err) { resultDiv.innerHTML = `❌ ${err.message}`; }
}

function sendEmergency() {
  const medicine = document.getElementById('emergencyMedicine').value.trim();
  const name = document.getElementById('emergencyName').value.trim();
  const phone = document.getElementById('emergencyPhone').value.trim();
  if (!medicine||!name||!phone) { alert('Please fill all fields!'); return; }
  document.getElementById('emergencyMsg').innerHTML = `✅ Emergency request sent for <strong>${medicine}</strong>!`;
  document.getElementById('emergencyMedicine').value='';
  document.getElementById('emergencyName').value='';
  document.getElementById('emergencyPhone').value='';
}

function showLogin() { closeModals(); document.getElementById('loginModal').style.display='flex'; }
function showRegister() { closeModals(); document.getElementById('registerModal').style.display='flex'; }
function closeModals() { document.getElementById('loginModal').style.display='none'; document.getElementById('registerModal').style.display='none'; }

async function register() {
  const name=document.getElementById('regName').value.trim(), email=document.getElementById('regEmail').value.trim(), password=document.getElementById('regPassword').value.trim(), role=document.getElementById('regRole').value;
  if(!name||!email||!password){document.getElementById('registerMsg').style.color='red';document.getElementById('registerMsg').textContent='Please fill all fields!';return;}
  try {
    const res=await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,role})});
    const data=await res.json();
    if(data.error){document.getElementById('registerMsg').style.color='red';document.getElementById('registerMsg').textContent=data.error;}
    else{document.getElementById('registerMsg').style.color='green';document.getElementById('registerMsg').textContent=data.message;setTimeout(()=>showLogin(),1500);}
  } catch(err){document.getElementById('registerMsg').textContent='Error: '+err.message;}
}

async function login() {
  const email=document.getElementById('loginEmail').value.trim(), password=document.getElementById('loginPassword').value.trim();
  if(!email||!password){document.getElementById('loginMsg').textContent='Please fill all fields!';return;}
  try {
    const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await res.json();
    if(data.error){document.getElementById('loginMsg').textContent=data.error;}
    else{localStorage.setItem('token',data.token);localStorage.setItem('userName',data.user.name);closeModals();updateAuthUI();}
  } catch(err){document.getElementById('loginMsg').textContent='Error: '+err.message;}
}

function logout() { localStorage.removeItem('token'); localStorage.removeItem('userName'); updateAuthUI(); }

function updateAuthUI() {
  const token=localStorage.getItem('token'), name=localStorage.getItem('userName');
  if(token) {
    document.getElementById('authButtons').style.display='none';
    document.getElementById('userInfo').style.display='flex';
    document.getElementById('userName').textContent=`👋 ${name}`;
    document.getElementById('mobileAuthBtns').style.display='none';
    document.getElementById('mobileUserInfo').style.display='block';
    document.getElementById('mobileUserName').textContent=`👋 ${name}`;
    document.getElementById('mobileLogout').style.display='block';
  } else {
    document.getElementById('authButtons').style.display='flex';
    document.getElementById('userInfo').style.display='none';
    document.getElementById('mobileAuthBtns').style.display='block';
    document.getElementById('mobileUserInfo').style.display='none';
    document.getElementById('mobileLogout').style.display='none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  document.getElementById('medicineInput').addEventListener('keypress', e => { if(e.key==='Enter') searchMedicine(); });
});
