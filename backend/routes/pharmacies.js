const express = require('express');
const router = express.Router();
const Pharmacy = require('../models/Pharmacy');

router.get('/', async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find().populate('inventory.medicine');
    res.json(pharmacies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const pharmacy = new Pharmacy(req.body);
    await pharmacy.save();
    res.status(201).json(pharmacy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/stock', async (req, res) => {
  try {
    const { medicineId, quantity, inStock } = req.body;
    const pharmacy = await Pharmacy.findById(req.params.id);
    const item = pharmacy.inventory.find(
      i => i.medicine.toString() === medicineId
    );
    if (item) {
      item.quantity = quantity;
      item.inStock = inStock;
    } else {
      pharmacy.inventory.push({ medicine: medicineId, quantity, inStock });
    }
    await pharmacy.save();
    res.json(pharmacy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;