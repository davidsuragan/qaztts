const axios = require('axios');

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        const { initData } = body;
        const botToken = process.env.BOT_TOKEN || process.env.TOKEN;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

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

        const userId = JSON.parse(urlParams.get('user')).id;

        const supabaseRes = await axios.get(
            `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        const settings = supabaseRes.data[0] || null;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, settings })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
