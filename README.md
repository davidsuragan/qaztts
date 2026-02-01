# QazTTS

Қазақша TTS (мәтінді сөйлеу) жобасы: Telegram-бот және веб-мини-қосымша. Бот **Vercel**-де жұмыс істейді; TTS API (endpoint) және сайт **Netlify Functions** пен Netlify-да іске қосылады — endpoint пен сайт сол Netlify функцияларымен жұмыс жасайды.

---

## Жоба құрылымы

| Бөлім | Қайда жұмыс істейді | Не істейді |
|-------|---------------------|------------|
| **bot/** | **Vercel** | Telegram-бот (Python, Aiogram, FastAPI). Мәтін/дауыс қабылдайды, TTS үшін сыртқы endpoint (Netlify backend) шақырады. Webhook: `/api/webhook`. |
| **backend/** | **Netlify Functions** | TTS API (endpoint): `tts` функциясы — ElevenLabs, ISSAI, Microsoft провайдерлері. `check-balance` — баланс тексеру. Бот пен сайт осы endpoint-ті шақырады. |
| **mini-app/** | **Netlify** (сайт + Functions) | Telegram Mini App (веб-интерфейс). Сайт Netlify-да хостингтеледі, ал авторизация, UI жүктеу, параметрлер сақтау — барлығы **Netlify Functions** арқылы: `auth`, `get-ui`, `get-settings`, `save-settings`, `get-ui-assets`. Сайт осы Netlify функцияларымен жұмыс жасайды. |

---

## Қысқаша архитектура

- **Бот (Vercel):** Пайдаланушы Telegram-да хабарлама жібереді → бот Vercel-дегі webhook арқылы қабылдайды → TTS үшін **Netlify-тағы backend** endpoint-ін шақырады (мысалы `/.netlify/functions/tts`) → аудио қайтарып, чатта жібереді.
- **Endpoint (Netlify Functions, backend):** `tts.js` — мәтінді аудиоға айналдырады (ElevenLabs / ISSAI / Microsoft). Сайт та осы endpoint-ті TTS үшін қолдана алады.
- **Сайт (mini-app, Netlify):** Статикалық сайт (index.html, script.js) Netlify-да хостингтеледі. Кіріс, интерфейс жүктеу, параметрлер — барлығы **Netlify Functions** арқылы: `/api/auth`, `/api/get-ui`, `/api/get-settings`, `/api/save-settings` (netlify.toml бойынша `/api/*` → `/.netlify/functions/:splat`). Яғни сайт да, endpoint те бір Netlify-та — сол Netlify функцияларымен жұмыс жасайды.

---

## Технологиялар

| Бөлім | Құралдар |
|-------|----------|
| **bot/** | Python, Aiogram, FastAPI, Supabase, Vercel (Serverless). |
| **backend/** | Node.js, Netlify Functions (tts.js, check-balance.js, provider/: elevenlabs, issai, microsoft). |
| **mini-app/** | HTML, JS, Telegram Web App API; Netlify (статика + functions: auth, get-ui, get-settings, save-settings). |

---

## Деплой (қалай қосу)

### Бот — Vercel

1. Vercel-де жаңа проект, **Root Directory** = `bot`.
2. Орта айнымалылары: `TOKEN` (BotFather), `LOCAL_BOT_TOKEN` (тест), `RUN_LOCAL`, `SUPABASE_URL`, `SUPABASE_KEY`, `ADMIN_ID`, `private_chat_id`. TTS үшін бот шақыратын backend URL-і (Netlify backend деплой сілтемесі + `/.netlify/functions/tts`) конфигте көрсетілуі керек.
3. Deploy. Webhook орнату: браузерде `https://<бот-домен>.vercel.app/set_webhook` ашу.

### Endpoint және backend — Netlify Functions

1. **backend/** — жеке Netlify сайты ретінде деплой етіңіз (мысалы Netlify UI-да репозиторийді қосып, Root Directory = `backend`). Немесе `netlify.toml` бар жерде `netlify deploy`.
2. Netlify `backend` үшін функциялар папкасы: `netlify/functions` (tts.js, check-balance.js т.б.). Деплой соңы сілтеме шығады, мысалы `https://backend-xxx.netlify.app/.netlify/functions/tts` — боттағы TTS endpoint ретінде осы URL қойылады.

(Ескерту: `backend` ішіндегі конфиг файлы аты `neltify.toml` болса, оны `netlify.toml` деп өзгерту керек, әйтпесе Netlify оны танымайды.)

### Сайт (mini-app) — Netlify + сол Netlify Functions

1. **mini-app/** — Netlify-да жеке проект ретінде деплой етіңіз (Root Directory = `mini-app`).
2. `mini-app/netlify.toml` бойынша: статика `/*` → `index.html`, ал `/api/*` → `/.netlify/functions/:splat`. Яғни сайт сол жердегі **Netlify Functions**-пен жұмыс жасайды: `auth`, `get-ui`, `get-settings`, `save-settings`, `get-ui-assets`.
3. Деплой соңы mini-app URL-і шығады — оны Telegram Mini App сілтемесі ретінде ботта көрсетуге болады (`mini_app_url` т.б.).

---

## Қорытынды

- **Бот** — Vercel-де жұмыс істейді.
- **Endpoint (TTS API)** — Netlify Functions (backend) арқылы жұмыс істейді.
- **Сайт (mini-app)** — Netlify-да хостингтеледі және сол Netlify функцияларымен (auth, get-ui, get-settings, save-settings) жұмыс жасайды.

Құрастырушы: **@davidsuragan**
