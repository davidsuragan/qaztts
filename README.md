# QazTTS

Қазақ тіліне арналған TTS (Text-to-Speech) кешені: Telegram-бот және Web Mini
App.

## Жоба құрылымы

- **bot/** — Telegram-бот (Python, Aiogram, FastAPI). Vercel-де орналасқан.
- **backend/** — TTS API (Node.js). Netlify Functions-те жұмыс істейді
  (ElevenLabs, ISSAI, Microsoft провайдерлері).
- **mini-app/** — Telegram Mini App (HTML/JS). Netlify-да орналасқан, баптаулар
  мен авторизация үшін Netlify Functions қолданады.

## Технологиялар

- **Bot:** Python, Aiogram, FastAPI, Supabase. (Vercel-де `vercel.json` арқылы
  `qaztts_app.py` іске қосылады).
- **Backend:** Node.js, Netlify Functions.
- **Mini App:** Vanilla JS, Telegram Web App API.

## Деплой

Netlify-ға деплой жасау үшін [GitHub Desktop](https://desktop.github.com/)
орнату ұсынылады. Бұл репозиторийді Netlify UI арқылы оңай байланыстыруға
мүмкіндік береді.

### 1. Backend (Netlify)

**Маңызды:** Netlify-да `.env` файлы автоматты түрде оқылмайды. Барлық
айнымалыларды Netlify Dashboard-тағы **Site configuration > Environment
variables** бөліміне қолмен енгізу қажет.

`backend/` папкасын Netlify-ға деплой жасап, `tts` функциясының URL-ін алыңыз.

### 2. Bot (Vercel)

Алдымен Vercel CLI орнатып, жүйеге кіріңіз (егер бұрын жасалмаса):

```bash
npm install -g vercel
vercel login
```

`bot/` папкасына `.env` файлын жасап, барлық қажетті айнымалыларды жазыңыз
(Vercel `.env` файлын автоматты түрде оқиды):

**Қажетті `.env` айнымалылары:**

```env
TOKEN=your_bot_token
LOCAL_BOT_TOKEN=your_test_token
ADMIN_ID=your_id
private_chat_id=your_chat_id
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

Содан кейін Vercel CLI арқылы деплой жасаңыз:

```bash
cd bot
vercel --prod
```

### 3. Mini App (Netlify)

`mini-app/` папкасын Netlify-ға деплой жасаңыз. Баптаулар `netlify.toml` арқылы
автоматты түрде реттеледі.

## Қолданылған ресурстар

- [Edge TTS](https://github.com/rany2/edge-tts) — Microsoft Edge-тің дауыстау
  технологиясы.
- [ISSAI Soyle](https://mangisoz.nu.edu.kz/soyle) — Назарбаев Университетінің
  қазақша TTS жүйесі.
- [ElevenLabs](https://elevenlabs.io/app/developers) — Кәсіби дауыс синтезі API.
- [EdgeTTS Interface](https://github.com/EdgeTTS/EdgeTTS.github.io) — Дыбыстау
  интерфейсіне арналған қосымша ресурстар.

---

Авторы: [@daketeach](https://t.me/daketeach)
