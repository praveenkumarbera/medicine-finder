const API = 'http://localhost:3000/api';

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

    // Scroll to results
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
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:red">❌ Error: ${err.message}</p>`;
  }
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