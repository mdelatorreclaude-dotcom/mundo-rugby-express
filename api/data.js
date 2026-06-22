export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { liga, section } = req.query;
  if (!liga) return res.status(400).json({ error: 'Falta parámetro liga' });

  try {
    const baseUrl = process.env.KV_REST_API_URL;
    const token   = process.env.KV_REST_API_READ_ONLY_TOKEN;

    // Leer datos
    const dataRes = await fetch(`${baseUrl}/get/liga:${liga}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataJson = await dataRes.json();

    // Leer timestamp
    const tsRes = await fetch(`${baseUrl}/get/last_updated`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tsJson = await tsRes.json();

    const lastUpdated = tsJson.result || null;

    if (!dataJson.result) {
      return res.status(404).json({ error: 'Sin datos aún. El cron aún no corrió.', lastUpdated });
    }

    const data = JSON.parse(dataJson.result);

    if (section && data[section] !== undefined) {
      return res.status(200).json({ data: data[section], lastUpdated });
    }

    res.status(200).json({ data, lastUpdated });
  } catch(e) {
    res.status(500).json({ error: 'Error leyendo datos', detail: e.message });
  }
}
