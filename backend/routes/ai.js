const express = require('express');
const router = express.Router();

router.post('/recommend', async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ error: 'Please provide symptoms!' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful medical assistant. Suggest common over-the-counter medicines for symptoms. Always end with a disclaimer to consult a doctor.'
          },
          {
            role: 'user',
            content: `I have the following symptoms: ${symptoms}. What medicines can help?`
          }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const recommendation = data.choices[0].message.content;
    res.json({ recommendation });

  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
