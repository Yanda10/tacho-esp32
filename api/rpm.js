import { Redis } from '@upstash/redis';

// Mendukung nama environment variable bawaan Upstash maupun Vercel KV
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // 1. ESP32 mengirim data RPM (POST)
  if (req.method === 'POST') {
    const { rpm } = req.body || {};

    if (typeof rpm !== 'number') {
      return res.status(400).json({ error: 'Format RPM tidak valid' });
    }

    const payload = {
      rpm: Math.round(rpm),
      updatedAt: Date.now(),
    };

    await redis.set('latest_rpm', payload);
    return res.status(200).json({ status: 'ok', saved: payload });
  }

  // 2. Halaman Web mengambil data RPM (GET)
  if (req.method === 'GET') {
    const data = await redis.get('latest_rpm');

    if (!data) {
      return res.status(200).json({ rpm: 0, online: false, updatedAt: null });
    }

    // Anggap ESP32 offline jika tidak ada data masuk lebih dari 8 detik
    const isOnline = Date.now() - data.updatedAt < 8000;

    return res.status(200).json({
      rpm: isOnline ? data.rpm : 0,
      online: isOnline,
      updatedAt: data.updatedAt,
    });
  }

  return res.status(405).json({ error: 'Method tidak diizinkan' });
}