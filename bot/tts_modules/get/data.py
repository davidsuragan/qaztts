import asyncio

from aiogram import *
from config import *
from aiogram.exceptions import TelegramAPIError, TelegramForbiddenError, TelegramRetryAfter

async def get_chat_members(user_id: int):
    try:
        chat_id = ''
        chat_member = await bot.get_chat_member(chat_id, user_id)
        if isinstance(chat_member, types.ChatMemberOwner):
            chat_member = "owner"
        elif isinstance(chat_member, types.ChatMemberAdministrator):
            chat_member = "admin"
        elif isinstance(chat_member, types.ChatMemberMember):
            chat_member = "member"
        elif isinstance(chat_member, types.ChatMemberRestricted):
            chat_member = "restricted"
        elif isinstance(chat_member, types.ChatMemberLeft):
            chat_member = "user"
        elif isinstance(chat_member, types.ChatMemberBanned):
            chat_member = "banned"
        return chat_member
    except TelegramAPIError as e:
        if 'PARTICIPANT_ID_INVALID' in str(e):
            print(f"PARTICIPANT_ID_INVALID.{user_id}")
            chat_member = "user"
            return chat_member
        elif "member not found" in str(e):
            chat_member = "user"
            return chat_member
    except Exception as e:
        print(f"Error: {e}")
        return None
    except TelegramRetryAfter as e:
        await asyncio.sleep(e.retry_after)
        print('e.retry_after:',e.retry_after)
        return await get_chat_members(user_id)