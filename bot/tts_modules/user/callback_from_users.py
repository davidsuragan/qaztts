import json
from aiogram import types
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram import F
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardRemove  

from config import router, url_kaspi, bot, mini_app_url, supabase, ELEVENLABS_ID_MAP
from tts_modules.bot.tts_func import *
from tts_modules.user.commands import *
from tts_modules.bot.tts_voices import AVAILABLE_VOICES

@router.message(F.web_app_data)
async def web_app_data_handler(message: types.Message):
    user_id = message.from_user.id
    first_name = message.from_user.first_name
    username = message.from_user.username

    try:
        web_app_data = json.loads(message.web_app_data.data)
        
        provider = web_app_data.get("provider", "Microsoft") 
        voice_raw = web_app_data.get("voice")

        if not voice_raw:
            await message.answer("⚠️ Дауыс дерегі табылмады!")
            return

        settings_to_save = {
            "user_id": user_id,
            "first_name": first_name,
            "username": username,
            "provider": provider
        }

        short_voice_name = ""

        if provider == "ISSAI":
            token = web_app_data.get("token")
            refresh_token = web_app_data.get("refresh_token") 
            emotion = web_app_data.get("emotion", "neutral")
            
            settings_to_save["voice"] = voice_raw
            settings_to_save["issai_token"] = token
            settings_to_save["issai_refresh"] = refresh_token
            settings_to_save["emotion"] = emotion
            settings_to_save["rate"] = "+0"
            settings_to_save["pitch"] = "+0"
            
            short_voice_name = voice_raw

        elif provider == "ElevenLabs":
            token = web_app_data.get("token")
            refresh_token = web_app_data.get("refresh_token")
            
            settings_to_save["voice"] = voice_raw
            settings_to_save["elevenlabs_token"] = token
            settings_to_save["elevenlabs_refresh"] = refresh_token
            settings_to_save["rate"] = "+0"
            settings_to_save["pitch"] = "+0"
            settings_to_save["emotion"] = "neutral"

            short_voice_name = ELEVENLABS_ID_MAP.get(voice_raw, voice_raw)

        else:
            rate = web_app_data.get("rate", "+0")
            pitch = web_app_data.get("pitch", "+0")

            if not isinstance(rate, str) or not rate.startswith(("+", "-")):
                rate = f"+{int(rate)}"
            if not isinstance(pitch, str) or not pitch.startswith(("+", "-")):
                pitch = f"+{int(pitch)}"

            voice_code = ""
            if "," in voice_raw:
                voice_code, _ = map(str.strip, voice_raw.split(",", 1))
            else:
                parts = voice_raw.split("-")
                if len(parts) >= 3:
                    voice_code = "-".join(parts[:2])
                else:
                    voice_code = "kk-KZ"

            voice_data = next(
                (v for v in AVAILABLE_VOICES.get(voice_code, []) if v["code"] == voice_raw),
                None
            )
            
            if not voice_data:
                settings_to_save["voice"] = voice_raw
            else:
                settings_to_save["voice"] = voice_data["code"]

            settings_to_save["rate"] = rate
            settings_to_save["pitch"] = pitch
            
            parts = settings_to_save["voice"].split("-")
            if len(parts) > 2:
                short_voice_name = parts[2].replace("Neural", "")
            else:
                short_voice_name = settings_to_save["voice"]

        # Баптаулар Mini App ішінде Supabase-ке тікелей сақталады. Ботқа күш түсірмеу үшін бұл жерден өшірілді.
        # supabase.table("user_settings").upsert(settings_to_save).execute()
        
        if provider == "ISSAI":
            tags_info = (
                "📌 <b>Тегтер:</b>\n"
                "<i>Мәтін арасына жазыңыз:</i>\n\n"
                "<code>[laugh]</code> — Күлу\n"
                "<code>[cough]</code> — Жөтелу\n"
                "<code>[sigh]</code> — Күрсіну\n"
                "<code>[sniffle]</code> — Мұрын тарту\n"
                "<code>[gasp]</code> — Ах ету\n"
                "<code>[stutter]</code> — Тұтығу\n"
                "<code>[whisper]</code> — Сыбырлау\n\n"
                "<b>Мысал:</b>\n"
                "Мен бүгін киноға бардым [laugh] Бірақ билетім жоғалып кетті, [sigh] Содан жылап-сықтап мұрынымды тартып қойдым [sniffle]\n\n"
                "📌 <b>Мәтінді сөйлетуге қолданыңыз.</b>\n"
            )
            text_resp = (
                f"✅ Сақталды!\n\n"
                f"Провайдер: <b>{provider}</b>\n"
                f"Дауыс: <b>{short_voice_name}</b>\n"
                f"Эмоция: <b>{emotion}</b>\n\n"
                f"<blockquote expandable>{tags_info}</blockquote>"
            )
        elif provider == "ElevenLabs":
            text_resp = (
                f"<b>✅ Сақталды!</b>\n\n"
                f"Провайдер: <b>{provider}</b>\n"
                f"Дауыс: <b>{short_voice_name}</b>\n"
            )
        else:
            text_resp = (
                f"<b>✅ Сақталды!</b>\n\n"
                f"Провайдер: <b>{provider}</b>\n"
                f"Дауыс: <b>{short_voice_name}</b>\n"
                f"Жылдамдық: <b>{settings_to_save['rate']}</b>\n"
                f"Тон: <b>{settings_to_save['pitch']}</b>"
            )

        await bot.send_message(
            chat_id=message.chat.id, 
            text=text_resp,
            parse_mode="HTML"  ,
            reply_markup=ReplyKeyboardRemove()
        )

    except Exception as e:
        print("Error WebApp Handler:", e)
        await message.answer("⚠️ Баптауларды сақтау кезінде қате шықты.")

@router.callback_query(lambda query: query.data in ["menu", "donate", "close_menu", "command", "info_command", "more_command",'voice'])
async def process_callback_kb1btn1(callback_query: types.CallbackQuery):
    
    if callback_query.message.chat.type == 'private':
        
        user_id = callback_query.from_user.id
        data = callback_query.data
        first_name= callback_query.from_user.first_name
        builder = InlineKeyboardBuilder()

        if data == "donate":
            builder.row((InlineKeyboardButton(text='🔴Kaspi Bank', url=url_kaspi))),
            builder.row((InlineKeyboardButton(text='« Артқа', callback_data='menu'))),
            await bot.edit_message_text(
                chat_id=callback_query.message.chat.id,
                message_id=callback_query.message.message_id, 
                text="Кез келген қаржыда авторға көмектсе аласыз. \n\n```7776144227``` Дауит С.", 
                reply_markup=builder.as_markup(),
                parse_mode='Markdown'
            )

        elif data == "menu":
            buttons = [
                [InlineKeyboardButton(text='🧑‍💻 Командалар', callback_data='command'), InlineKeyboardButton(text='🎁 Донат жасау', callback_data='donate')],
                [InlineKeyboardButton(text='🔼 Мәзірді жабу', callback_data='close_menu')]
                ]

            keyboard = types.InlineKeyboardMarkup(inline_keyboard=buttons)
            text = "Сәлем! Мен ЖИ қосылған, ағылшын тілі бот-мұғалімімін. Cізбен ағылшын тілінде сөйлесіп не болмаса аударуға сөздер жібере аламын.\n\nМаған орнатылған негізгі командалар осы белгі '/' арқылы немесе \"Мәзір\" батырмасы арқылы орындылады." + "\n\nТөменде боттың мәзірі көрсетілген👇"
            await bot.edit_message_text(
                chat_id=callback_query.message.chat.id, 
                message_id=callback_query.message.message_id,  
                text=text,
                reply_markup=keyboard,
                parse_mode='Markdown')
        
        elif data == "close_menu":
            text, keyboard = await welcome_message(user_id, first_name, callback_query.message, inline=True)
            
            if keyboard:
                await bot.edit_message_text(
                    chat_id=callback_query.message.chat.id,
                    message_id=callback_query.message.message_id,
                    text=text,
                    reply_markup=keyboard,
                    parse_mode='Markdown'
                )
            else:
                 await bot.edit_message_text(
                    chat_id=callback_query.message.chat.id,
                    message_id=callback_query.message.message_id,
                    text=text,
                    parse_mode='Markdown'
                )

        elif data == "command":
            text = " Ботта орналасқан командалар тізімі 👇"
            builder.row(
                InlineKeyboardButton(text=f"Дауыс таңдау", callback_data="voice"))
            builder.row(
                InlineKeyboardButton(text=f"ℹ️ Ақпарат", callback_data="info_command"),
                InlineKeyboardButton(text=f"🤖 Басқа боттар", callback_data="more_command"))
            builder.row(InlineKeyboardButton(text='« Мәзір', callback_data='menu'))
            await bot.edit_message_text(chat_id=callback_query.message.chat.id, message_id=callback_query.message.message_id, text=text, reply_markup=builder.as_markup())
        
        elif data == "voice":
            keyboard = InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="🎤 Дауыс таңдау", web_app=WebAppInfo(url=mini_app_url))],
                [InlineKeyboardButton(text="« Артқа", callback_data="command")]
            ])
        
            msg = "Дауыс таңдаңыз👇"
            await bot.edit_message_text(
                chat_id=callback_query.message.chat.id,
                message_id=callback_query.message.message_id,
                text=msg,
                reply_markup=keyboard
            )
        elif data == "info_command":
            builder.row(InlineKeyboardButton(text='« Артқа', callback_data='command'))
            msg = handler_texts('info_handler')
            await bot.edit_message_text(
                chat_id=callback_query.message.chat.id,
                message_id=callback_query.message.message_id,
                text=msg,
                reply_markup=builder.as_markup()
            )
        elif data == "more_command":
            builder.row(InlineKeyboardButton(text='« Артқа', callback_data='command'))
            msg = handler_texts('more_handler')
            await bot.edit_message_text(
                chat_id=callback_query.message.chat.id,
                message_id=callback_query.message.message_id,
                text=msg,
                reply_markup = builder.as_markup()
            )
    else:
        print("Not PRIVATE CHAT:", callback_query.message.chat.type)