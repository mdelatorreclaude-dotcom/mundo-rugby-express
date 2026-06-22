import { kv } from '@vercel/kv';

// Todas las ligas y torneos a actualizar
const LIGAS = [
  // Cóndores
  { id: 'condores_all',    full: 'Chile Los Cóndores selección nacional de rugby' },
  { id: 'condores_trc',   full: 'Chile Los Cóndores The Rugby Championship 2026' },
  { id: 'condores_wc',    full: 'Chile Los Cóndores Clasificatorias RWC 2027' },
  { id: 'condores_tours', full: 'Chile Los Cóndores tours internacionales 2026' },
  // Domésticas
  { id: 'chile',          full: 'Campeonato Nacional Chile rugby 2026' },
  { id: 'urc',            full: 'United Rugby Championship 2025-26' },
  { id: 'top14',          full: 'Top 14 Francia 2025-26' },
  { id: 'premiership',    full: 'Premiership Inglaterra 2025-26' },
  { id: 'superrugby',     full: 'Super Rugby Pacific 2026' },
  { id: 'sra',            full: 'Super Rugby Americas 2026' },
  { id: 'uar',            full: 'Torneo de la UAR 2026' },
  // Internacionales
  { id: 'trc',            full: 'The Rugby Championship 2026' },
  { id: 'sixnations',     full: 'Six Nations 2026' },
  { id: 'autumnnations',  full: 'Autumn Nations Series 2026' },
  { id: 'tours',          full: 'Tours internacionales selecciones 2026' },
  { id: 'rwc',            full: 'Rugby World Cup 2027 Clasificatorias' },
];

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

async function fetchLigaData(liga) {
  const src = 'Busca prioritariamente en rugbypass.com, espn.com y sitios oficiales.';
  const data = {};

  // Resultados
  try {
    const raw = await callClaude(`${src} Últimos 6 resultados de ${liga.full}. SOLO JSON:
{"torneos":[{"liga":"nombre","round":"ronda","partidos":[{"id":"slug","fecha":"DD/MM","local":"equipo","visitante":"equipo","score_local":N,"score_visitante":N,"ciudad":"ciudad"}]}]}
Si no hay: {"torneos":[]}`);
    data.resultados = parseJSON(raw)?.torneos || [];
  } catch(e) { data.resultados = []; }

  // Próximos
  try {
    const raw = await callClaude(`${src} Próximos 6 partidos de ${liga.full}. SOLO JSON:
{"partidos":[{"fecha":"DD/MM","hora":"HH:MM","local":"equipo","visitante":"equipo","ciudad":"ciudad"}]}
Si no hay: {"partidos":[]}`);
    data.proximos = parseJSON(raw)?.partidos || [];
  } catch(e) { data.proximos = []; }

  // Tabla
  try {
    const raw = await callClaude(`${src} Tabla de posiciones actual de ${liga.full}. SOLO JSON:
{"equipos":[{"pos":N,"equipo":"nombre","pj":N,"pg":N,"pp":N,"pts":N}]}
Mínimo 6 equipos. Si no hay: {"equipos":[]}`);
    data.tabla = parseJSON(raw)?.equipos || [];
  } catch(e) { data.tabla = []; }

  // Noticias
  try {
    const isCondores = liga.id.startsWith('condores');
    const extra = isCondores ? 'Enfocate en Los Cóndores, rugby chileno, jugadores chilenos.' : '';
    const n = isCondores ? 8 : 5;
    const raw = await callClaude(`${src} Las ${n} noticias más relevantes de ${liga.full}. ${extra} SOLO JSON:
{"noticias":[{"titulo":"título","resumen":"2-3 oraciones","fuente":"sitio","relevancia":N}]}
relevancia 1-3. Si no hay: {"noticias":[]}`);
    data.noticias = parseJSON(raw)?.noticias || [];
  } catch(e) { data.noticias = []; }

  // Resumen
  try {
    const isCondores = liga.id.startsWith('condores');
    const extra = isCondores ? 'Incluí ranking mundial, jugadores destacados y perspectivas.' : '';
    const raw = await callClaude(`${src} Resumen en español de ${liga.full} últimas 3 semanas. ${extra} Máximo 180 palabras, prosa fluida.`);
    data.resumen = raw;
  } catch(e) { data.resumen = ''; }

  return data;
}

export default async function handler(req, res) {
  // Verificar que viene del cron de Vercel (seguridad)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log(`[CRON] Iniciando actualización: ${new Date().toISOString()}`);
  const results = {};

  for (const liga of LIGAS) {
    try {
      console.log(`[CRON] Actualizando ${liga.id}...`);
      const data = await fetchLigaData(liga);
      await kv.set(`liga:${liga.id}`, JSON.stringify(data), { ex: 60 * 60 * 24 * 3 }); // expira en 3 días
      results[liga.id] = 'ok';
    } catch(e) {
      console.error(`[CRON] Error en ${liga.id}:`, e.message);
      results[liga.id] = 'error';
    }
  }

  // Guardar timestamp de última actualización
  await kv.set('last_updated', new Date().toISOString());

  console.log('[CRON] Actualización completa:', results);
  res.status(200).json({ ok: true, updated: new Date().toISOString(), results });
}
