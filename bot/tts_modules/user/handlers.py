# import sys
# sys.path.insert(0, '/home/dav/zip_tts/tts107')

import uuid, asyncio, httpx, logging, random, re, hashlib, base64
from aiogram import types, F
from datetime import datetime
from aiogram.types import BufferedInputFile, FSInputFile
from aiogram.types import InlineQueryResultCachedAudio

from config import * 
from tts_modules.bot.tts_func import generate_tts

@router.message(F.text)
async def text_handler(message: types.Message):
    user_id = message.from_user.id
    user_input = message.text.strip()
    
    try:
        await bot.send_chat_action(message.chat.id, "upload_audio")
        
        for word in forbidden_words:
            if re.search(fr'\b{re.escape(word)}\b', user_input, flags=re.IGNORECASE):
                await message.answer(f"❌ Табылған тыйым салынған сөз: {word}")
                return
            
        provider = "Microsoft"
        voice = "kk-KZ-AigulNeural"
        rate = "+0"
        pitch = "+0"
        token = None
        emotion = "neutral"
        language = "kk"

        try:
            response_db = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
            if response_db.data and len(response_db.data) > 0:
                user_data = response_db.data[0]
                provider = user_data.get('provider', "Microsoft")
                voice = user_data.get('voice', voice)
                rate = user_data.get('rate', rate)
                pitch = user_data.get('pitch', pitch)
                emotion = user_data.get('emotion', "neutral")
                
                if provider.lower() == "issai":
                    token = user_data.get('issai_token')
                    language = ISSAI_LANG_MAP.get(voice.lower(), "kk")
                elif provider.lower() == "elevenlabs":
                    token = user_data.get('elevenlabs_token')
                
        except Exception as db_error:
            logging.error(f"Supabase error: {db_error}")

        if provider.lower() in ["issai", "elevenlabs"] and not token:
            await message.reply(f"⚠️ {provider} токені табылмады. Баптаулардан (WebApp) кілтті енгізіңіз.")
            return

        audio_bytes = await generate_tts(
            text=user_input,
            provider=provider,
            voice_id=voice,
            token=token,
            rate=rate,
            pitch=pitch,
            emotion=emotion,
            language=language
        )

        if audio_bytes:
            current_time = datetime.now().strftime("%H%M%S")
            unique_filename = f'qaztts-{uuid.uuid4().hex[:4]}_{current_time}.mp3'
            audio_input_file = BufferedInputFile(audio_bytes, filename=unique_filename)
            logo_path = FSInputFile(logo_name)

            caption = f"🗣 Сіздің аудиоңыз!\n\n@qaztts_bot"

            await bot.send_audio(
                chat_id=message.chat.id,
                audio=audio_input_file,
                caption=caption,
                performer="qaztts_bot",
                title=f"Аудио",
                thumbnail=logo_path,
                reply_to_message_id=message.message_id
            )
        else:
            await message.reply(f"⚠️ {provider} арқылы аудио файл жасалмады.")

    except Exception as e:
        logging.error(f"[text_handler ERROR]: {e}", exc_info=True)
        await message.reply("⚠️ Жүйелік қате орын алды.")

@router.inline_query()
async def inline_tts(inline_query: types.InlineQuery) -> None:
    user_id = inline_query.from_user.id
    text = inline_query.query.strip()
    if not text:
        await bot.answer_inline_query(
            inline_query.id,
            results=[],
            switch_pm_text="Мәтін енгізіңіз",
            switch_pm_parameter="start"
        )
        return

    try:
        voices = ['kk-KZ-AigulNeural', 'kk-KZ-DauletNeural']
        voice = random.choice(voices)
        
        audio_bytes = await generate_tts(text=text, provider="microsoft", voice_id=voice)

        if not audio_bytes:
            logging.error("Inline TTS: Audio generation failed")
            return

        now = datetime.now()
        unique_filename = f'qaztts-{uuid.uuid4().hex[:4]}_{now.strftime("%Y%m%d-%H%M%S")}.mp3'
        logo_path = FSInputFile(logo_name)
        audio_input_file = BufferedInputFile(audio_bytes, filename=unique_filename)

        storage_chat_id = -1002145381732 
        audio_info = await bot.send_audio(
            chat_id=storage_chat_id,
            audio=audio_input_file,
            performer=botname,
            title=text,
            thumbnail=logo_path
        )

        config.file_id[user_id] = audio_info.audio.file_id
        result_id = hashlib.md5(text.encode()).hexdigest()

        item = InlineQueryResultCachedAudio(
            id=result_id,
            audio_file_id=config.file_id[user_id],
            caption="Ұзақ мәтінді @qaztts_bot ботында дыбыстаңыз."
        )

        await bot.answer_inline_query(
            inline_query.id,
            results=[item],
            cache_time=1
        )

    except Exception as e:
        logging.error(f"[inline_tts ERROR]: {e}")