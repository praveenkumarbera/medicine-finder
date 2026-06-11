const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.name || req.query.q || '').trim();
    if (!q) return res.json([]);
    const medicines = await Medicine.find({ name: { $regex: q, $options: 'i' } });
    res.json(medicines);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/category', async (req, res) => {
  try {
    const cat = String(req.query.cat || '').trim();
    if (!cat || cat.toLowerCase() === 'all') {
      return res.json(await Medicine.find().limit(60));
    }
    res.json(await Medicine.find({ category: { $regex: cat, $options: 'i' } }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try { res.json(await Medicine.find()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res.status(201).json(medicine);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
