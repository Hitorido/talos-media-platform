import { Router } from 'express';
import { cookieStore } from '../providers/shared/sourceHttp.js';

const router = Router();

router.post('/cookie', async (req, res) => {
  try {
    const { domain, cookie } = req.body;
    if (!domain || !cookie) {
      return res.status(400).json({ error: 'Missing domain or cookie' });
    }

    // Store cookie with 30 minute expiry
    cookieStore.set(domain, {
      cookie,
      expires: Date.now() + 30 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store cookie' });
  }
});

router.get('/cookie/:domain', (req, res) => {
  const { domain } = req.params;
  const stored = cookieStore.get(domain);

  if (!stored || stored.expires < Date.now()) {
    cookieStore.delete(domain);
    return res.json({ cookie: null });
  }

  res.json({ cookie: stored.cookie });
});

export default router;
