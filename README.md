# Mundo Rugby Express 🦅
App de rugby con foco en Los Cóndores. Se actualiza sola 8 veces por fin de semana.

---

## Resumen de lo que vas a hacer
1. Crear una cuenta en GitHub (donde se guarda el código)
2. Subir los archivos de la app a GitHub
3. Crear una cuenta en Vercel (donde vive la app en internet)
4. Conectar Vercel con GitHub para publicar la app
5. Agregar las claves secretas que necesita la app para funcionar
6. Instalarla en tu celular como app

Tiempo estimado: **30–45 minutos**. No necesitás saber programar.

---

## PASO 1 — Crear tu API key de Anthropic
*(Esto le da poder a la app para buscar noticias y resultados)*

1. Abrí https://console.anthropic.com en tu navegador
2. Hacé click en **"Sign Up"** y creá una cuenta con tu email
3. Una vez adentro, en el menú de la izquierda buscá **"API Keys"**
4. Click en **"Create Key"**
5. Ponle un nombre (ej: `mundo-rugby`) y click en **"Create Key"**
6. Va a aparecer una clave larga que empieza con `sk-ant-...`
7. **Copiala y guardala en un bloc de notas** — solo la vas a ver una vez

---

## PASO 2 — Crear una cuenta en GitHub
*(GitHub es como Google Drive pero para código. Gratis.)*

1. Abrí https://github.com
2. Click en **"Sign up"**
3. Ingresá tu email, creá una contraseña y elegí un nombre de usuario
4. Verificá tu email cuando llegue el mensaje de confirmación

---

## PASO 3 — Subir los archivos a GitHub

### 3.1 — Descomprimir el ZIP
- En tu computadora, buscá el archivo **`mundo-rugby-express.zip`** que descargaste
- Hacé doble click para descomprimirlo
- Va a aparecer una carpeta llamada **`mundo-rugby-express`** con archivos adentro

### 3.2 — Crear un repositorio en GitHub
*(Un repositorio es como una carpeta en la nube para tu proyecto)*

1. Entrá a https://github.com con tu cuenta
2. Click en el botón verde **"New"** (o el ícono **"+"** arriba a la derecha → "New repository")
3. En **"Repository name"** escribí: `mundo-rugby-express`
4. Dejá seleccionado **"Public"**
5. **NO** marques ninguna otra opción
6. Click en **"Create repository"**

### 3.3 — Subir los archivos
Ahora vas a ver una pantalla medio técnica. Buscá el texto que dice **"uploading an existing file"** y hacé click ahí.

1. Vas a ver una zona grande que dice **"Drag files here"** (arrastrar archivos aquí)
2. Abrí la carpeta `mundo-rugby-express` que descomprimiste
3. **Seleccioná todos los archivos y carpetas adentro** (Ctrl+A en Windows, Cmd+A en Mac)
4. Arrástralos a esa zona de GitHub
5. Esperá que suban todos (puede tardar un minuto)
6. Abajo vas a ver un botón verde que dice **"Commit changes"** — hacé click ahí
7. ✅ Listo, tu código ya está en GitHub

---

## PASO 4 — Crear la base de datos en Vercel
*(Aquí se guardan los datos de los partidos entre actualizaciones)*

1. Abrí https://vercel.com y hacé click en **"Sign Up"**
2. Elegí **"Continue with GitHub"** — así conecta todo automáticamente
3. Una vez adentro, en el menú de arriba buscá **"Storage"**
4. Click en **"Create Database"**
5. Elegí **"KV"** (la primera opción)
6. Ponle nombre: `rugby-kv` y click en **"Create"**
7. En la pantalla que aparece, buscá la pestaña **".env.local"**
8. Click en **"Copy Snippet"** — esto copia todas las variables que necesitás
9. **Pegalo en tu bloc de notas** — lo vas a necesitar en el paso siguiente

Va a verse algo así (con tus valores reales):
```
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

---

## PASO 5 — Publicar la app en Vercel

1. En Vercel, click en **"Add New Project"** (botón arriba a la derecha)
2. Va a aparecer tu repositorio `mundo-rugby-express` — click en **"Import"**
3. **No toques nada más** excepto la sección **"Environment Variables"** que está más abajo
4. Ahí tenés que agregar estas variables una por una:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | La clave `sk-ant-...` que guardaste en el Paso 1 |
| `CRON_SECRET` | Inventate una contraseña (ej: `rugbyChile2026!`) |
| `KV_URL` | El valor que copiaste en el Paso 4 |
| `KV_REST_API_URL` | El valor que copiaste en el Paso 4 |
| `KV_REST_API_TOKEN` | El valor que copiaste en el Paso 4 |
| `KV_REST_API_READ_ONLY_TOKEN` | El valor que copiaste en el Paso 4 |

Para agregar cada una: escribís el nombre en "Name", el valor en "Value", click en "Add".

5. Una vez agregadas todas, click en **"Deploy"**
6. Vercel va a tardar 1–2 minutos en publicar la app
7. Al terminar te va a mostrar una URL del estilo `mundo-rugby-express.vercel.app`
8. ✅ **¡Tu app ya está en internet!**

---

## PASO 6 — Instalar en tu celular como app

**iPhone (Safari):**
1. Abrí la URL de tu app en Safari
2. Tocá el ícono de compartir (el cuadrado con la flecha hacia arriba)
3. Buscá **"Agregar a pantalla de inicio"**
4. Tocá **"Agregar"**

**Android (Chrome):**
1. Abrí la URL de tu app en Chrome
2. Tocá el menú (los tres puntitos arriba a la derecha)
3. Tocá **"Instalar app"** o **"Agregar a pantalla de inicio"**

Ahora va a aparecer el ícono de Mundo Rugby Express en tu celular como cualquier otra app.

---

## Horarios de actualización automática
La app se actualiza sola en estos horarios (hora Chile):

| Día | Horarios |
|-----|----------|
| Viernes | 8:00am |
| Sábado | 8:00am · 11:00am · 5:00pm |
| Domingo | 8:00am · 12:00pm · 5:00pm |
| Lunes | 8:00am |

---

## Costo
| Servicio | Costo |
|----------|-------|
| Vercel (hosting + actualizaciones automáticas) | **Gratis** |
| Vercel KV (base de datos) | **Gratis** hasta 30.000 usos/mes |
| Anthropic API (8 actualizaciones por semana) | **~USD 1–2/mes** |
| Dominio propio ej: `mundorugby.cl` (opcional) | **~USD 12/año** |

Sin dominio propio, la URL es gratis: `mundo-rugby-express.vercel.app`

---

## ¿Algo no funcionó?
Escribile a Claude en claude.ai describiendo en qué paso te trabaste y te ayuda a resolverlo.
