const express = require('express');
const router = express.Router();

const CHENNAI_PHARMACIES = [
  {name:'Apollo Pharmacy - Anna Nagar',address:'Anna Nagar, Chennai',phone:'044-26161234',lat:13.0891,lng:80.2107},
  {name:'Apollo Pharmacy - T Nagar',address:'T Nagar, Chennai',phone:'044-28341234',lat:13.0418,lng:80.2341},
  {name:'Apollo Pharmacy - Adyar',address:'Adyar, Chennai',phone:'044-24421234',lat:13.0012,lng:80.2565},
  {name:'Apollo Pharmacy - Velachery',address:'Velachery, Chennai',phone:'044-22431234',lat:12.9815,lng:80.2180},
  {name:'Apollo Pharmacy - Tambaram',address:'Tambaram, Chennai',phone:'044-22261234',lat:12.9249,lng:80.1000},
  {name:'MedPlus - Anna Nagar',address:'Anna Nagar West, Chennai',phone:'1800-425-1234',lat:13.0850,lng:80.2050},
  {name:'MedPlus - T Nagar',address:'Pondy Bazaar, T Nagar',phone:'1800-425-1234',lat:13.0400,lng:80.2300},
  {name:'MedPlus - Adyar',address:'LB Road, Adyar, Chennai',phone:'1800-425-1234',lat:12.9980,lng:80.2540},
  {name:'MedPlus - Velachery',address:'Velachery Main Road',phone:'1800-425-1234',lat:12.9790,lng:80.2200},
  {name:'MedPlus - Porur',address:'Porur, Chennai',phone:'1800-425-1234',lat:13.0350,lng:80.1567},
  {name:'Wellness Forever - Nungambakkam',address:'Nungambakkam High Road',phone:'044-28221234',lat:13.0569,lng:80.2425},
  {name:'Netmeds Pharmacy - Mylapore',address:'Mylapore, Chennai',phone:'044-24611234',lat:13.0335,lng:80.2689},
  {name:'Trust Pharmacy - Guindy',address:'Guindy, Chennai',phone:'044-22501234',lat:13.0067,lng:80.2206},
  {name:'Sri Balaji Pharmacy - Chromepet',address:'Chromepet, Chennai',phone:'044-22381234',lat:12.9516,lng:80.1462},
  {name:'Jan Aushadhi - Anna Nagar',address:'Anna Nagar, Chennai',phone:'',lat:13.0920,lng:80.2150}
];

function getDistKm(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Try Overpass first
    try {
      const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](around:3000,${lat},${lng});node["shop"="chemist"](around:3000,${lat},${lng}););out body;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        const pharmacies = data.elements
          .filter(p => p.lat && p.lon)
          .map(p => ({
            name: p.tags.name || 'Medical Store',
            address: [p.tags['addr:street'], p.tags['addr:suburb'], p.tags['addr:city']].filter(Boolean).join(', ') || 'Nearby',
            phone: p.tags.phone || '',
            lat: p.lat, lng: p.lon,
            distance: getDistKm(userLat, userLng, p.lat, p.lon)
          }))
          .sort((a,b) => a.distance - b.distance)
          .slice(0, 10);

        if (pharmacies.length > 0) return res.json(pharmacies);
      }
    } catch(e) {
      console.log('Overpass failed, using fallback:', e.message);
    }

    // Fallback: return hardcoded pharmacies sorted by distance
    const fallback = CHENNAI_PHARMACIES
      .map(p => ({ ...p, distance: getDistKm(userLat, userLng, p.lat, p.lng) }))
      .sort((a,b) => a.distance - b.distance)
      .slice(0, 8);

    res.json(fallback);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
