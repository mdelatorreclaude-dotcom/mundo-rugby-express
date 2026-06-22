async function callClaude(messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages,
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
    const r = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_READ_ONLY_TOKEN}` }
    });
    const json = await r.json();
    let result = json.result;
    if (!result) return null;
    // Upstash a veces devuelve {value, ex} en vez del valor directo
    try {
      const parsed = JSON.parse(result);
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        result = parsed.value;
      }
    } catch(e) {}
    return result;
  } catch(e) { return null; }
}

async function kvSet(key, value) {
  try {
    // Usar SET con EX como parámetros separados (sintaxis correcta de Upstash REST)
    await fetch(`${process.env.KV_REST_API_URL}/set/${key}/${encodeURIComponent(value)}/EX/21600`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
  } catch(e) {}
}

const SOURCES = {
  condores_all:   'rugbypass.com, espn.com, worldrugby.org, feruchi.cl, ellibero.cl, latercera.com, emol.com, biobiochile.cl, cooperativa.cl, sudamericanarugby.org',
  condores_trc:   'rugbypass.com, espn.com, worldrugby.org, therugbychampionship.com, feruchi.cl, latercera.com, ellibero.cl',
  condores_wc:    'rugbypass.com, worldrugby.org, rugbyworldcup.com, feruchi.cl, latercera.com, espn.com',
  condores_tours: 'rugbypass.com, worldrugby.org, feruchi.cl, latercera.com, espn.com, ellibero.cl',
  chile:          'feruchi.cl, ellibero.cl, latercera.com, emol.com, biobiochile.cl, cooperativa.cl, rugbypass.com, sudamericanarugby.org',
  urc:            'rugbypass.com, espn.com, unitedRugby.com, bbc.co.uk/sport/rugby-union, theguardian.com/sport, skysports.com/rugby-union',
  top14:          'rugbypass.com, espn.com, lnr.fr, rugbyrama.fr, midi-olympique.fr, bbc.co.uk/sport/rugby-union',
  premiership:    'rugbypass.com, espn.com, premiershiprugby.com, bbc.co.uk/sport/rugby-union, skysports.com/rugby-union, theguardian.com',
  superrugby:     'rugbypass.com, espn.com, super.rugby, bbc.co.uk/sport/rugby-union, stuff.co.nz, smh.com.au',
  sra:            'rugbypass.com, espn.com, sudamericanarugby.org, espn.com.ar, infobae.com, latercera.com',
  uar:            'rugbypass.com, uar.com.ar, espn.com.ar, infobae.com, clarin.com/deportes, ole.com.ar, sudamericanarugby.org',
  trc:            'rugbypass.com, espn.com, therugbychampionship.com, worldrugby.org, bbc.co.uk/sport, stuff.co.nz, espn.com.ar',
  sixnations:     'rugbypass.com, espn.com, sixnationsrugby.com, bbc.co.uk/sport/rugby-union, theguardian.com, skysports.com',
  autumnnations:  'rugbypass.com, espn.com, worldrugby.org, bbc.co.uk/sport/rugby-union, theguardian.com',
  tours:          'rugbypass.com, espn.com, worldrugby.org, bbc.co.uk/sport/rugby-union, stuff.co.nz',
  rwc:            'rugbypass.com, worldrugby.org, rugbyworldcup.com, espn.com, bbc.co.uk/sport/rugby-union',
};

const LIGA_NAMES = {
  condores_all:   'Chile Los Cóndores selección nacional de rugby',
  condores_trc:   'Chile Los Cóndores en The Rugby Championship 2026',
  condores_wc:    'Chile Los Cóndores Clasificatorias Rugby World Cup 2027',
  condores_tours: 'Chile Los Cóndores tours y partidos internacionales 2026',
  chile:          'Liga Chilena de Rugby Campeonato Nacional FERUCHI 2026',
  urc:            'United Rugby Championship 2025-26',
  top14:          'Top 14 Rugby Francia 2025-26',
  premiership:    'Gallagher Premiership Rugby Inglaterra 2025-26',
  superrugby:     'Super Rugby Pacific 2026',
  sra:            'Super Rugby Americas 2026',
  uar:            'Torneo de la Unión Argentina de Rugby UAR 2026',
  trc:            'The Rugby Championship 2026',
  sixnations:     'Six Nations Championship 2026',
  autumnnations:  'Autumn Nations Series 2026',
  tours:          'Tours internacionales de selecciones de rugby 2026',
  rwc:            'Rugby World Cup 2027 Clasificatorias',
};

async function fetchFromClaude(ligaId, section) {
  const ligaFull = LIGA_NAMES[ligaId] || ligaId;
  const sources  = SOURCES[ligaId] || 'rugbypass.com, espn.com, worldrugby.org';
  const isC      = ligaId.startsWith('condores') || ligaId === 'chile';
  const today    = new Date().toLocaleDateString('es-CL', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const seasonNote = `IMPORTANTE: Si el torneo ya terminó su temporada, mostrá igualmente los últimos datos disponibles — últimos resultados, tabla final, campeón. No devuelvas datos vacíos solo porque el torneo no está activo ahora. Siempre hay algo para mostrar.`;

  if (section === 'resultados') {
    return callClaude([{
      role: 'user',
      content: `Hoy es ${today}. Busca los últimos 6 resultados de partidos de ${ligaFull}.
Fuentes (en orden de prioridad): ${sources}.
Buscá: "${ligaFull} resultados 2026", "${ligaFull} scores", "${ligaFull} fixtures results", "${ligaFull} partidos jugados".
Si el torneo terminó, mostrá los últimos partidos de la temporada incluyendo finales y playoffs.
${seasonNote}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"estado_torneo":"en curso|finalizado|pausa","temporada":"2025-26 o 2026 según corresponda","torneos":[{"liga":"nombre oficial","round":"Ronda N o Final o Semi Final o Playoff","partidos":[{"id":"equipo1-vs-equipo2","fecha":"DD/MM","local":"nombre equipo local","visitante":"nombre equipo visitante","score_local":N,"score_visitante":N,"ciudad":"ciudad o estadio"}]}]}
Si absolutamente no encontrás ningún resultado devuelve: {"estado_torneo":"sin datos","temporada":"","torneos":[]}`
    }]);
  }

  if (section === 'proximos') {
    return callClaude([{
      role: 'user',
      content: `Hoy es ${today}. Busca los próximos 6 partidos programados de ${ligaFull}.
Fuentes: ${sources}.
Buscá: "${ligaFull} fixture 2026", "${ligaFull} próximos partidos", "${ligaFull} schedule upcoming".
Si el torneo terminó y no hay partidos futuros confirmados, indicalo claramente y mostrá cuándo empieza la próxima temporada si lo sabés.

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"estado":"hay partidos|torneo finalizado|sin confirmar","proxima_temporada":"fecha aproximada si aplica","partidos":[{"fecha":"DD/MM","hora":"HH:MM","local":"equipo","visitante":"equipo","ciudad":"ciudad o estadio"}]}
Si no hay partidos futuros devuelve: {"estado":"torneo finalizado","proxima_temporada":"","partidos":[]}`
    }]);
  }

  if (section === 'tabla') {
    return callClaude([{
      role: 'user',
      content: `Hoy es ${today}. Busca la tabla de posiciones de ${ligaFull}.
Fuentes: ${sources}.
Buscá: "${ligaFull} tabla posiciones", "${ligaFull} standings", "${ligaFull} clasificación".
Si el torneo terminó, mostrá la tabla FINAL de la última temporada indicando el campeón.
${seasonNote}

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"estado_torneo":"en curso|finalizado","temporada":"temporada","campeon":"nombre si el torneo ya terminó o vacío","equipos":[{"pos":N,"equipo":"nombre","pj":N,"pg":N,"pp":N,"pts":N}]}
Incluí mínimo 6 equipos. Si no encontrás devuelve: {"estado_torneo":"sin datos","temporada":"","campeon":"","equipos":[]}`
    }]);
  }

  if (section === 'noticias') {
    const extra = isC
      ? `Enfocate en noticias sobre ${ligaFull}, jugadores chilenos en el exterior, convocatorias, lesiones, declaraciones del cuerpo técnico y resultados recientes.`
      : `Enfocate en noticias impactantes: resultados sorpresa, lesiones de figuras, fichajes, declaraciones importantes y novedades del torneo.`;
    const n = isC ? 8 : 6;
    return callClaude([{
      role: 'user',
      content: `Hoy es ${today}. Busca las ${n} noticias más relevantes y recientes sobre ${ligaFull}.
Fuentes: ${sources}.
${extra}
Si el torneo terminó, buscá noticias del cierre de temporada, campeón, análisis y novedades para la próxima temporada.
Priorizá noticias que aparecen en más de un medio.

Responde SOLO con JSON válido sin texto adicional ni markdown:
{"noticias":[{"titulo":"título","resumen":"2-3 oraciones con lo más importante","fuente":"nombre del sitio","relevancia":N,"fecha_aprox":"hace X días o DD/MM si la sabés"}]}
relevancia: 3=muy importante y mencionada en varios medios, 2=relevante, 1=noticia menor.
Si no encontrás devuelve: {"noticias":[]}`
    }]);
  }

  if (section === 'resumen') {
    const extra = isC
      ? `Incluí: posición en el ranking mundial World Rugby, últimos resultados, próximos partidos importantes, jugadores destacados y perspectivas del equipo.`
      : `Incluí: estado del torneo (si terminó menciona el campeón), equipos o selecciones más destacadas, jugadores en forma y lo que viene.`;
    return callClaude([{
      role: 'user',
      content: `Hoy es ${today}. Escribí un resumen en español de la actualidad de ${ligaFull}.
Fuentes: ${sources}.
${extra}
Si el torneo terminó esta temporada, hacé un balance de lo más importante.
Máximo 200 palabras, prosa fluida, sin listas ni bullets, directo al punto.`
    }]);
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { liga, section } = req.query;
  if (!liga || !section) return res.status(400).json({ error: 'Faltan parámetros' });

  const cacheKey = `v3:liga:${liga}:${section}`;

  try {
    const cached = await kvGet(cacheKey);
    const lastUpdated = await kvGet('last_updated');

    if (cached) {
      return res.status(200).json({ data: JSON.parse(cached), lastUpdated, source: 'cache' });
    }

    const raw = await fetchFromClaude(liga, section);
    let data;

    if (section === 'resumen') {
      data = raw;
    } else if (section === 'resultados') {
      const parsed = parseJSON(raw);
      data = parsed ? { estado: parsed.estado_torneo, temporada: parsed.temporada, torneos: parsed.torneos || [] } : { estado: 'sin datos', torneos: [] };
    } else if (section === 'proximos') {
      const parsed = parseJSON(raw);
      data = parsed ? { estado: parsed.estado, proxima_temporada: parsed.proxima_temporada, partidos: parsed.partidos || [] } : { estado: 'sin datos', partidos: [] };
    } else if (section === 'tabla') {
      const parsed = parseJSON(raw);
      data = parsed ? { estado: parsed.estado_torneo, temporada: parsed.temporada, campeon: parsed.campeon, equipos: parsed.equipos || [] } : { estado: 'sin datos', equipos: [] };
    } else if (section === 'noticias') {
      data = parseJSON(raw)?.noticias || [];
    }

    await kvSet(cacheKey, JSON.stringify(data));
    await kvSet('last_updated', new Date().toISOString());

    res.status(200).json({ data, lastUpdated: new Date().toISOString(), source: 'realtime' });

  } catch(e) {
    res.status(500).json({ error: 'Error cargando datos', detail: e.message });
  }
}
