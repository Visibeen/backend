const express = require('express');
const axios = require('axios');
const router = express.Router();
const WABA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WABA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

router.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === WABA_VERIFY_TOKEN) {
      console.log('WhatsApp webhook verification succeeded');
      return res.status(200).send(challenge);
    }
    console.warn('WhatsApp webhook verification failed');
    return res.sendStatus(403);
  } catch (err) {
    return res.sendStatus(500);
  }
});

router.post('/webhook', async (req, res) => {
  try {
    res.sendStatus(200);
    const body = req.body;
    if (!body || body.object !== 'whatsapp_business_account') return;
    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value || {};
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const message of messages) {
          const from = message.from; 
          const type = message.type;
          let text = '';
          if (type === 'text') {
            text = message.text?.body || '';
          } else if (type === 'button') {
            text = message.button?.text || message.button?.payload || '';
          } else if (type === 'interactive') {
            text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
          }

          if (from && text) {
            console.log('Incoming WA message from', from, 'text:', text);
            await sendTextMessage(from, `You said: ${text}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('WhatsApp webhook error:', err?.response?.data || err.message);
  }
});

router.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }
    const result = await sendTextMessage(to, message);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      error: err.response?.data || err.message,
    });
  }
});

async function sendTextMessage(to, text) {
  if (!WABA_TOKEN || !WABA_PHONE_NUMBER_ID) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
  }
  const url = `https://graph.facebook.com/v20.0/${WABA_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const { data } = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${WABA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
  return data;
}

module.exports = router;
