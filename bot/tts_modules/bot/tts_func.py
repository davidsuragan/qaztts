import httpx, logging, base64
from aiogram.types import InlineKeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from config import mini_app_url, supabase, TTS_PROVIDER

def handler_texts(handler_name):
    if handler_name == 'start_handler':
        text = 'Дисклеймер: бот оқу-танысу үшін жасалынған. Барлық ЖИ моделдері character ai сайтынан алынды.\n\nСәлем! Менде түрлі ЖИ тұлғалар орналасқан.\n\n/character-командасын басыңыз.'
    elif handler_name == 'more_handler':
        text = "\tМенің басқа да боттарым. Таныс болыңыз!\n\n @dauys_bot"
    elif handler_name == 'info_handler':
        text = "Ботты жасаушы @davidsuragan.\n Әр түрлі тілде ер және әйел дауыстарды қолдана аласың\n\n/voice - арқылы дауыс таңдаңыз."
    return text

async def generate_tts(text, provider="microsoft", voice_id=None, token=None, rate="+0%", pitch="+0%", emotion="neutral", language="kk"):
    payload = {
        "provider": provider.lower(),
        "text": text,
        "voice_id": voice_id,
        "rate": rate,
        "pitch": pitch,
        "emotion": emotion,
        "language": language
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        headers["Authorization"] = "Bearer default_token"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(TTS_PROVIDER, json=payload, headers=headers)
            
            if res.status_code == 200:
                data = res.json()
                b64_str = data.get("audioBase64") or data.get("audio_base64") or data.get("data")
                
                if b64_str:
                    return base64.b64decode(b64_str)
            else:
                logging.error(f"[generate_tts] Error {res.status_code}: {res.text}")
        except Exception as e:
            logging.error(f"[generate_tts] Exception: {e}")
    
    return None

async def send_webapp_ui(bot, chat_id, text, btn_text="Дауыс таңдау 🗣", url=mini_app_url):
    try:
        webapp_button = InlineKeyboardButton(
            text=btn_text, 
            web_app=WebAppInfo(url=url)
        )
        
        builder = InlineKeyboardBuilder()
        builder.add(webapp_button)
        
        await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=builder.as_markup(),
            parse_mode="HTML"
        )
    except Exception as e:
        print(f"Error sending WebApp UI: {e}")