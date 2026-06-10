const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

router.post('/recommend', async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Please provide symptoms!' });

    const allMedicines = await Medicine.find({}, 'name category description requiresPrescription');
    const medicineList = allMedicines.map(m =>
      `${m.name} (${m.category}) - ${m.description} - ${m.requiresPrescription ? 'Needs prescription' : 'No prescription needed'}`
    ).join('\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a helpful medical assistant for an Indian pharmacy app called MediFind.
You MUST only recommend medicines from this exact list available in our database:

${medicineList}

Rules:
1. Only suggest medicines from the list above — never suggest anything outside it
2. Suggest 3-5 most relevant medicines for the symptoms
3. For each medicine, show: Medicine name, why it helps, dosage tip
4. Group by: First suggest no-prescription medicines, then prescription ones
5. Use this format for each medicine:
   💊 [Medicine Name]
   ✅ Why: [one line reason]
   📋 Dose: [simple dosage tip]
6. End with: "⚠️ This is a suggestion only. Please consult a doctor before taking any medicine."
Keep the response clear and easy to read on mobile.`
          },
          {
            role: 'user',
            content: `My symptoms: ${symptoms}`
          }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    const recommendation = data.choices[0].message.content;
    res.json({ recommendation });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
