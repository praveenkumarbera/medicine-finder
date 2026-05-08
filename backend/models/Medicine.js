const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  price: { type: Number },
  requiresPrescription: { type: Boolean, default: false }
});

module.exports = mongoose.model('Medicine', medicineSchema);