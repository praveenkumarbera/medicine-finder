const express = require('express');
const router = express.Router();

router.post('/recommend', async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ error: 'Please provide symptoms!' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful medical assistant. A patient has the following symptoms: "${symptoms}". Please suggest common over-the-counter medicines that might help. Format your response clearly with medicine name, what it helps with, and dosage advice. Always end with: "⚠️ This is for informational purposes only. Please consult a doctor before taking any medicine." Keep response concise and in simple English.`
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({ error: 'No response from AI. Try again!' });
    }

    const recommendation = data.candidates[0].content.parts[0].text;
    res.json({ recommendation });

  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
