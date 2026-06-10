const express = require('express');
const router = express.Router();

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const query = `[out:json][timeout:30];(node["amenity"="pharmacy"](around:5000,${lat},${lng});node["shop"="chemist"](around:5000,${lat},${lng});way["amenity"="pharmacy"](around:5000,${lat},${lng}););out center;`;

    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!data.elements || !data.elements.length) return res.json([]);

    const pharmacies = data.elements
      .filter(p => (p.lat && p.lon) || p.center)
      .map(p => ({
        name: p.tags.name || 'Medical Store',
        address: [p.tags['addr:street'], p.tags['addr:city'], p.tags['addr:suburb']].filter(Boolean).join(', ') || 'Nearby',
        phone: p.tags.phone || p.tags['contact:phone'] || '',
        lat: p.lat || p.center.lat,
        lng: p.lon || p.center.lon
      }));

    res.json(pharmacies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
