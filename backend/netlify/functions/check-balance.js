const axios = require('axios');
const { getCorsHeaders, handleOptionsRequest } = require('./utils/cors');

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin, ['GET', 'POST', 'OPTIONS']);

    if (event.httpMethod === 'OPTIONS') {
        return handleOptionsRequest(event, ['GET', 'POST', 'OPTIONS']);
    }

    try {
        let body = {};
        if (event.httpMethod === 'POST' && event.body) {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error("JSON Parse Error:", e.message);
            }
        }

        const authHeader = event.headers.authorization || event.headers.Authorization || body.token;
        const provider = body.provider || 'elevenlabs';

        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    status: "error", 
                    message: "Токен жоқ (Unauthorized)" 
                })
            };
        }

        const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();

        if (provider.toLowerCase() === 'elevenlabs') {
            try {
                const response = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
                    headers: {
                        'xi-api-key': token,
                        'Accept': 'application/json'
                    }
                });

                const data = response.data;
                const limit = data.character_limit || 0;
                const used = data.character_count || 0;
                let tokensLeft = limit - used;
                if (tokensLeft < 0) tokensLeft = 0;

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        status: "success",
                        provider: "ElevenLabs",
                        tokens_left: tokensLeft,
                        tier: data.tier,
                        details: {
                            limit: limit,
                            used: used,
                            reset_date_unix: data.next_character_count_reset_unix
                        }
                    })
                };
            } catch (e) {
                if (e.response && e.response.status === 401) {
                    const detail = e.response.data?.detail || {};
                    if (detail.status === "missing_permissions") {
                        throw new Error("ElevenLabs API кілтіне 'user_read' рұқсаты (permission) жетіспейді.");
                    }
                }
                throw e;
            }
        } 
        else if (provider.toLowerCase() === 'issai') {
            // ISSAI-де баланс тексеру эндпоинты жоқ болғандықтан, 
            // кілттің жарамдылығын тексеру үшін дауыстар тізімін сұраймыз
            // ТІЗЕТУ: language параметрін қосу міндетті
            const response = await axios.get('https://mangisoz.nu.edu.kz/backend/api/v1/expressive-tts/voices?language=kk', {
                headers: {
                    'X-API-Key': token,
                    'Accept': 'application/json'
                }
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: "success",
                    provider: "ISSAI",
                    message: "API Key is valid",
                    tokens_left: "Unlimited"
                })
            };
        }
        else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Белгісіз провайдер" })
            };
        }

    } catch (error) {
        console.error("Check Balance Error:", error.message);

        const status = error.response ? error.response.status : 500;
        let message = "Балансты тексеру кезінде қате орын алды";

        if (status === 401) {
            message = "Токен ескірген немесе жарамсыз. Қайта кіріңіз.";
        }

        return {
            statusCode: status,
            headers,
            body: JSON.stringify({
                status: "error",
                message: message,
                detail: error.response ? (error.response.data || error.message) : error.message
            })
        };
    }
};