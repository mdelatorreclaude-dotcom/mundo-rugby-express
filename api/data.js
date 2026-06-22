import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { liga, section } = req.query;
  if (!liga) return res.status(400).json({ error: 'Falta parámetro liga' });

  try {
    // Leer datos del KV
    const raw = await kv.get(`liga:${liga}`);
    const lastUpdated = await kv.get('last_updated');

    if (!raw) {
      return res.status(404).json({ error: 'Sin datos aún. El cron aún no corrió.', lastUpdated });
    }

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Si piden una sección específica, devolver solo esa
    if (section && data[section] !== undefined) {
      return res.status(200).json({ data: data[section], lastUpdated });
    }

    res.status(200).json({ data, lastUpdated });
  } catch(e) {
    res.status(500).json({ error: 'Error leyendo datos', detail: e.message });
  }
}
