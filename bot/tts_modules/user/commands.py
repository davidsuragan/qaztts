from aiogram import types
from aiogram.types import KeyboardButton, WebAppInfo, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder, InlineKeyboardButton
from aiogram.filters import Command

from config import router, bot, mini_app_url, supabase, ELEVENLABS_ID_MAP
from tts_modules.bot.tts_func import *
from tts_modules.get.data import get_chat_members

# /send_welcome
@router.message(Command("start"))
async def send_welcome(message: types.Message):
    first_name = message.from_user.first_name
    user = message.chat.id
    try:
        if message.chat.type == 'private':
            text, keyboard = await welcome_message(user, first_name, message, inline=False)
            if keyboard:
                await message.answer(text=text, reply_markup=keyboard)
            else:
                await message.answer(text=text)
    except Exception as e:
        print("Error on start_handler:", e)

async def welcome_message(user_id, first_name, message, inline=False):
    role_user = await get_chat_members(user_id=user_id)
    
    voice = None
    try:
        response = supabase.table("user_settings").select("voice").eq("user_id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            voice = response.data[0].get('voice')
    except Exception as e:
        print(f"Supabase check error: {e}")

    try:
        if inline:
            inline_kb = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🔽 Мәзір", callback_data="menu")]
            ])
            if role_user in ('member', 'admin', 'owner') and not voice:
                wlc_msg = f"*{first_name}*. Мәтінді аудиоға түрлендіру үшін, /voice басып дауыс таңдаңыз."
                return wlc_msg, inline_kb
            else:
                return "Қош келдіңіз!", None
    
        else:
            webapp_button = KeyboardButton(text="Дауыс таңдау", web_app=WebAppInfo(url=mini_app_url))
            reply_builder = ReplyKeyboardBuilder()
            reply_builder.add(webapp_button)
    
            if not role_user or role_user == 'user':
                return "Сәлем, байланыста мәтінді қазақша сөйлететін - QazTTS боты. /voice басып дауыс таңдаңыз.", None
            
            elif role_user in ('member', 'admin', 'owner') and not voice:
                wlc_msg = f"*{first_name}*. Мәтінді аудиоға түрлендіру үшін, төмендегі батырма арқылы дауыс таңдаңыз."
                return wlc_msg, reply_builder.as_markup(resize_keyboard=True)
            else:
                return "Қош келдіңіз! Мәтін жазыңыз.", None
    except Exception as e:
        print("Error on welcome_message:", e)
        return "Қате орын алды.", None

# /voice
@router.message(Command("voice"))
async def choice_voice(message: types.Message):
    try:
        if message.chat.type != "private":
            return

        user_id = message.from_user.id
        webapp_url=mini_app_url
        
        response = supabase.table("user_settings").select("provider, voice").eq("user_id", user_id).execute()
        user_has_settings = response.data and len(response.data) > 0
        
        if user_has_settings:
            settings = response.data[0]
            current_provider = settings.get("provider", "Microsoft")
            raw_voice = settings.get("voice", "—")
            
            short_voice_name = raw_voice
            if current_provider == "Microsoft":
                parts = raw_voice.split("-")
                if len(parts) > 2:
                    short_voice_name = parts[2].replace("Neural", "")
            elif current_provider == "ElevenLabs" and 'ELEVENLABS_ID_MAP' in globals():
                short_voice_name = ELEVENLABS_ID_MAP.get(raw_voice, raw_voice)
            
            msg_text = (
                f"<b>Провайдер:</b> {current_provider}\n"
                f"<b>Дауыс:</b> {short_voice_name}\n\n"
                f"👇 Өзгерту үшін батырманы басыңыз:"
            )
            btn_text = "Дауысты өзгерту 🗣"
            
        else:
            msg_text = "Дауыс таңдаңыз 👇"
            btn_text = "Дауыс таңдау 🗣"
            
        await send_webapp_ui(bot, message.chat.id, msg_text, btn_text, url=mini_app_url)

    except Exception as e:
        print(f"Error on choice_voice: {e}")
        await send_webapp_ui(bot, message.chat.id, "Дауыс таңдаңыз 👇", url=mini_app_url)

# /info
@router.message(Command("info"))
async def info_handler(message: types.Message):
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text='Дауыс таңдау', callback_data='voice'))
    builder.row(InlineKeyboardButton(text='🔽 Мәзір', callback_data='menu'))

    info_text = handler_texts('info_handler') 
    await message.answer(info_text, reply_markup=builder.as_markup())

# /more
@router.message(Command("more"))
async def more_handler(message: types.Message):
    more_text = handler_texts('more_handler')
    await message.answer(more_text, parse_mode=None)