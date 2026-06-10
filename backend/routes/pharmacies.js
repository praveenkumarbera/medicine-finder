const express = require('express');
const router = express.Router();

const CHENNAI_PHARMACIES = [
  { name:'Apollo Pharmacy - Anna Nagar', address:'Anna Nagar, Chennai', phone:'044-26161234', lat:13.0891, lng:80.2107 },
  { name:'Apollo Pharmacy - T Nagar', address:'T Nagar, Chennai', phone:'044-28341234', lat:13.0418, lng:80.2341 },
  { name:'Apollo Pharmacy - Adyar', address:'Adyar, Chennai', phone:'044-24421234', lat:13.0012, lng:80.2565 },
  { name:'Apollo Pharmacy - Velachery', address:'Velachery, Chennai', phone:'044-22431234', lat:12.9815, lng:80.2180 },
  { name:'MedPlus - Anna Nagar', address:'Anna Nagar West, Chennai', phone:'1800-425-1234', lat:13.0850, lng:80.2050 },
  { name:'MedPlus - T Nagar', address:'Pondy Bazaar, T Nagar', phone:'1800-425-1234', lat:13.0400, lng:80.2300 },
  { name:'MedPlus - Adyar', address:'LB Road, Adyar, Chennai', phone:'1800-425-1234', lat:12.9980, lng:80.2540 },
  { name:'MedPlus - Velachery', address:'Velachery Main Road', phone:'1800-425-1234', lat:12.9790, lng:80.2200 },
  { name:'Netmeds Pharmacy - Mylapore', address:'Mylapore, Chennai', phone:'044-24611234', lat:13.0335, lng:80.2689 },
  { name:'Trust Pharmacy - Guindy', address:'Guindy, Chennai', phone:'044-22501234', lat:13.0067, lng:80.2206 },
  { name:'Jan Aushadhi - Anna Nagar', address:'Anna Nagar, Chennai', phone:'', lat:13.0920, lng:80.2150 },
  { name:'Sri Balaji Pharmacy - Chromepet', address:'Chromepet, Chennai', phone:'044-22381234', lat:12.9516, lng:80.1462 }
];

function getDistKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const pharmacies = CHENNAI_PHARMACIES
      .map(p => ({ ...p, distance: getDistKm(userLat, userLng, p.lat, p.lng) }))
      .sort((a, b) => a.distance - b.distance);
    res.json(pharmacies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
