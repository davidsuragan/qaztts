from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from typing import Callable, Any, Dict

ALLOWED_CHAT_ID = -1002789024926

class ChatFilterMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Any],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        chat = data.get("event_chat")
        if not chat:
            return await handler(event, data)
        if chat.type in ("group", "supergroup") and chat.id != ALLOWED_CHAT_ID:
            return

        return await handler(event, data)