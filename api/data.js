async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content.map(b => b.type === 'text' ? b.text : '').filter(Boolean).join('');
}

function parseJSON(text) {
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { return null; }
}

async function kvGet(key) {
  try {
    const baseUrl = process.env.KV_REST_API_URL;
    const token   = process.env.KV_REST_API_READ_ONLY_TOKEN;
    const r = await fetch(`${baseUrl}/get/${key}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await r.json();
    return json.result || null;
  } catch(e) { return null; }
}

async function kvSet(key, value) {
  try {
    const baseUrl = process.env.KV_REST_API_URL;
    const token   = process.env.KV_REST_API_TOKEN;
    await fetch(`${baseUrl}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, ex: 60 * 60 * 24 * 3 })
    });
  } catch(e) {}
}

async function fetchFromClaude(ligaId, ligaFull, section) {
  const src = 'Busca prioritariamente en rugbypass.com, espn.com y sitios oficiales.';
  const isC = ligaId.startsWith('condores');

  if (section === 'resultados') {
    const raw = await callClaude(`${src} Últimos 6 resultados de ${ligaFull}. SOLO JSON:
{"torneos":[{"liga":"nombre","round":"ronda","partidos":[{"id":"slug","fecha":"DD/MM","local":"equipo","visitante":"equipo","score_local":N,"score_visitante":N,"ciudad":"ciudad"}]}]}
Si no hay: {"torneos":[]}`);
    return parseJSON(raw)?.torneos || [];
  }

  if (section === 'proximos') {
    const raw = await callClaude(`${src} Próximos 6 partidos de ${ligaFull}. SOLO JSON:
{"partidos":[{"fecha":"DD/MM","hora":"HH:MM","local":"equipo","visitante":"equipo","ciudad":"ciudad"}]}
Si no hay: {"partidos":[]}`);
    return parseJSON(raw)?.partidos || [];
  }

  if (section === 'tabla') {
    const raw = await callClaude(`${src} Tabla de posiciones actual de ${ligaFull}. SOLO JSON:
{"equipos":[{"pos":N,"equipo":"nombre","pj":N,"pg":N,"pp":N,"pts":N}]}
Mínimo 6 equipos. Si no hay: {"equipos":[]}`);
    return parseJSON(raw)?.equipos || [];
  }

  if (section === 'noticias') {
    const extra = isC ? 'Enfocate en Los Cóndores, rugby chileno y jugadores chilenos.' : '';
    const n = isC ? 8 : 5;
    const raw = await callClaude(`${src} Las ${n} noticias más relevantes de ${ligaFull}. ${extra} SOLO JSON:
{"noticias":[{"titulo":"título","resumen":"2-3 oraciones","fuente":"sitio","relevancia":N}]}
relevancia 1-3. Si no hay: {"noticias":[]}`);
    return parseJSON(raw)?.noticias || [];
  }

  if (section === 'resumen') {
    const extra = isC ? 'Incluí ranking mundial, jugadores destacados y perspectivas.' : '';
    return await callClaude(`${src} Resumen en español de ${ligaFull} últimas 3 semanas. ${extra} Máximo 180 palabras, prosa fluida.`);
  }

  return null;
}

const LIGA_NAMES = {
  condores_all:   'Chile Los Cóndores selección nacional de rugby',
  condores_trc:   'Chile Los Cóndores The Rugby Championship 2026',
  condores_wc:    'Chile Los Cóndores Clasificatorias RWC 2027',
  condores_tours: 'Chile Los Cóndores tours internacionales 2026',
  chile:          'Campeonato Nacional Chile rugby 2026',
  urc:            'United Rugby Championship 2025-26',
  top14:          'Top 14 Francia 2025-26',
  premiership:    'Premiership Inglaterra 2025-26',
  superrugby:     'Super Rugby Pacific 2026',
  sra:            'Super Rugby Americas 2026',
  uar:            'Torneo de la UAR 2026',
  trc:            'The Rugby Championship 2026',
  sixnations:     'Six Nations 2026',
  autumnnations:  'Autumn Nations Series 2026',
  tours:          'Tours internacionales selecciones 2026',
  rwc:            'Rugby World Cup 2027 Clasificatorias',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { liga, section } = req.query;
  if (!liga || !section) return res.status(400).json({ error: 'Faltan parámetros' });

  const cacheKey = `liga:${liga}:${section}`;

  try {
    // 1. Intentar leer del KV (datos del cron)
    const cached = await kvGet(cacheKey);
    const lastUpdated = await kvGet('last_updated');

    if (cached) {
      return res.status(200).json({
        data: JSON.parse(cached),
        lastUpdated,
        source: 'cache'
      });
    }

    // 2. No hay datos en caché → buscar en tiempo real con Claude
    const ligaFull = LIGA_NAMES[liga] || liga;
    const data = await fetchFromClaude(liga, ligaFull, section);

    // 3. Guardar en KV para próximas visitas (expira en 6 horas)
    await kvSet(cacheKey, JSON.stringify(data));
    await kvSet('last_updated', new Date().toISOString());

    res.status(200).json({
      data,
      lastUpdated: new Date().toISOString(),
      source: 'realtime'
    });

  } catch(e) {
    res.status(500).json({ error: 'Error cargando datos', detail: e.message });
  }
}
