const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  inventory: [
    {
      medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
      quantity: { type: Number, default: 0 },
      inStock: { type: Boolean, default: false }
    }
  ]
});

module.exports = mongoose.model('Pharmacy', pharmacySchema);