import os

from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, Router
from aiogram.fsm.storage.memory import MemoryStorage
from datetime import datetime
from supabase import create_client, Client

load_dotenv()

botname = "qaztts_bot"
logo_name = r'tts_modules/get/logs/qaztts.jpg'

private_chat_id = os.getenv('private_chat_id')
BOT_TOKEN = os.getenv("TOKEN")
LOCAL_BOT_TOKEN = os.getenv("LOCAL_BOT_TOKEN")
ADMIN_ID = os.getenv("ADMIN_ID")

is_local = os.getenv("RUN_LOCAL", "false").lower() == "true"
current_token = LOCAL_BOT_TOKEN if is_local and LOCAL_BOT_TOKEN else BOT_TOKEN
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=current_token)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)
router = Router()
dp.include_router(router)

now = datetime.now()

TTS_PROVIDER = "/.netlify/functions/tts"

url_kaspi = "https://kaspi.kz/transfers/categories/kaspi-client"
mini_app_url=""

class config():
    file_id = {}

ISSAI_LANG_MAP = {
    "akzhol": "kk", "aibek": "kk", "rayana": "kk", "mahabbat": "kk",
    "alex": "ru", "elena": "ru",
    "coral": "en", "ballad": "en"
}

ELEVENLABS_ID_MAP = {
    "ocZQ262SsZb9RIxcQBOj": "Lulu Lollipop",
    "Z3R5wn05IrDiVCyEkUrK": "Arabella",
    "NNl6r8mD7vthiJatiJt1": "Bradford",
    "tSVwqkJGEKjLklhiN0Nx": "Viraj DRL"
}

forbidden_words = ["frobidden","words","list","example"]


