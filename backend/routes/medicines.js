const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    const medicines = await Medicine.find({
      name: { $regex: name, $options: 'i' }
    });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res.status(201).json(medicine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;