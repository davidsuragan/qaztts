const axios = require('axios');


exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, body: "" };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const { initData, settings } = body;
        const botToken = process.env.BOT_TOKEN || process.env.TOKEN;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!botToken || !initData) {
            return { statusCode: 400, body: JSON.stringify({ error: "Деректер жетіспейді" }) };
        }

        const crypto = require('crypto');
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();
        let dataCheckString = "";
        for (const [key, value] of urlParams.entries()) dataCheckString += `${key}=${value}\n`;
        dataCheckString = dataCheckString.slice(0, -1);

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            return { statusCode: 403, body: JSON.stringify({ error: "Invalid Telegram data" }) };
        }

        const telegramUser = JSON.parse(urlParams.get('user'));
        const userId = telegramUser.id;

        const allowedKeys = ['voice', 'provider', 'rate', 'pitch', 'emotion', 'issai_token', 'elevenlabs_token'];
        const filteredSettings = {};
        if (settings) {
            allowedKeys.forEach(key => {
                if (settings[key] !== undefined) filteredSettings[key] = settings[key];
            });
        }

        const payload = {
            user_id: userId,
            first_name: telegramUser.first_name,
            username: telegramUser.username,
            ...filteredSettings
        };

        const supabaseRes = await axios.post(
            `${supabaseUrl}/rest/v1/user_settings`,
            payload,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                }
            }
        );

        if (supabaseRes.status >= 200 && supabaseRes.status < 300 && settings && settings.voice) {
            const provider = settings.provider || "Microsoft";
            let short_voice_name = settings.voice;
            let text_resp = "";

            if (provider === "ISSAI") {
                short_voice_name = settings.voice;
                const tags_info = 
                    "📌 <b>Тегтер:</b>\n" +
                    "<i>Мәтін арасына жазыңыз:</i>\n\n" +
                    "<code>[laugh]</code> — Күлу\n" +
                    "<code>[cough]</code> — Жөтелу\n" +
                    "<code>[sigh]</code> — Күрсіну\n" +
                    "<code>[sniffle]</code> — Мұрын тарту\n" +
                    "<code>[gasp]</code> — Ах ету\n" +
                    "<code>[stutter]</code> — Тұтығу\n" +
                    "<code>[whisper]</code> — Сыбырлау\n\n" +
                    "<b>Мысал:</b>\n" +
                    "Мен бүгін киноға бардым [laugh] Бірақ билетім жоғалып кетті, [sigh]\n\n" +
                    "📌 <b>Мәтінді сөйлетуге қолданыңыз.</b>";

                text_resp = 
                    `✅ <b>Сақталды!</b>\n\n` +
                    `Провайдер: <b>${provider}</b>\n` +
                    `Дауыс: <b>${short_voice_name}</b>\n` +
                    `Эмоция: <b>${settings.emotion || "neutral"}</b>\n\n` +
                    `<blockquote expandable>${tags_info}</blockquote>`;

            } else if (provider === "ElevenLabs") {
                short_voice_name = settings.voice; 
                text_resp = 
                    `<b>✅ Сақталды!</b>\n\n` +
                    `Провайдер: <b>${provider}</b>\n` +
                    `Дауыс: <b>${short_voice_name}</b>`;

            } else {
                const parts = settings.voice.split("-");
                if (parts.length > 2) {
                    short_voice_name = parts[2].replace("Neural", "");
                }
                
                text_resp = 
                    `<b>✅ Сақталды!</b>\n\n` +
                    `Провайдер: <b>${provider}</b>\n` +
                    `Дауыс: <b>${short_voice_name}</b>\n` +
                    `Жылдамдық: <b>${settings.rate || "+0"}</b>\n` +
                    `Тон: <b>${settings.pitch || "+0"}</b>`;
            }

            const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            try {
                await axios.post(tgUrl, {
                    chat_id: userId,
                    text: text_resp,
                    parse_mode: 'HTML'
                });
            } catch (tgErr) {
                console.error("Telegram Notify Error:", tgErr.response?.data || tgErr.message);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "Баптаулар сақталып, хабарлама жіберілді" })
        };

    } catch (error) {
        console.error("Save Settings Error:", error.response?.data || error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
