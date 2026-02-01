import traceback
import json
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import os
from aiogram.types import Update

if __name__ == "__main__":
    os.environ["RUN_LOCAL"] = "true"

from config import bot, dp, is_local
from tts_modules.bot.chat_filter import ChatFilterMiddleware
from tts_modules.bot.tts_func import *

from tts_modules.user.callback_from_users import *
from tts_modules.user.commands import *
from tts_modules.user.handlers import *
from tts_modules.get.data import *

app = FastAPI()

print(f"ℹ️ Бот іске қосылуда. Режим: {'LOCAL (Polling)' if is_local else 'PRODUCTION (Webhook)'}")

dp.update.middleware(ChatFilterMiddleware())

@app.post("/api/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        update = Update.model_validate(data)
        await dp.feed_update(bot, update)
        await bot.session.close()
    except Exception:
        print("[ERROR webhook]:", traceback.format_exc())
    return JSONResponse(content={"ok": True})

@app.get("/set_webhook")
async def set_webhook(request: Request):
    from os import getenv
    base_url = str(request.base_url).rstrip("/")
    webhook_url = f"{base_url}/api/webhook"
    tg_url = f"https://api.telegram.org/bot{getenv('TOKEN')}/setWebhook"

    payload = {
        "url": webhook_url,
        "allowed_updates": ["message", "chat_member", "callback_query"],
        "drop_pending_updates": True
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(tg_url, json=payload)
            res.raise_for_status()
            return res.json()
    except Exception:
        return {"error": traceback.format_exc()}

@app.api_route("/", methods=["GET", "HEAD"])
async def root(request: Request):
    return {"message": "✅ Aiogram + FastAPI бот жұмыс істеп тұр!"}

if __name__ == "__main__":
    import asyncio
    import logging

    async def start_polling():
        logging.basicConfig(level=logging.INFO)
        print("🚀 Бот LOCAL (Polling) режимінде іске қосылуда...")
        
        await dp.start_polling(bot)

    try:
        asyncio.run(start_polling())
    except KeyboardInterrupt:
        print("🛑 Бот тоқтатылды")
