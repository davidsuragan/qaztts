const generateElevenLabsTTS = require('./provider/elevenlabs');
const generateIssaiTTS = require('./provider/issai');
const generateMicrosoftTTS = require('./provider/microsoft');
const { getCorsHeaders, handleOptionsRequest } = require('./utils/cors');

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin, ['POST', 'OPTIONS']);

    if (event.httpMethod === 'OPTIONS') {
        return handleOptionsRequest(event, ['POST', 'OPTIONS']);
    }

    try {
        let body = {};
        try {
            body = JSON.parse(event.body || "{}");
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ status: "error", message: "Invalid JSON" }) };
        }

        const { provider, text, voice_id, rate, pitch } = body;
        
        const authHeader = event.headers.authorization || event.headers.Authorization || body.token;

        if (!authHeader) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Authorization token missing" }) };
        }
        if (!text) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Text is required" }) };
        }

        const cleanToken = String(authHeader).replace(/^Bearer\s+/i, "").trim();

        let result;

        if (provider === 'elevenlabs' || provider === 'ElevenLabs') {
            result = await generateElevenLabsTTS(text, voice_id, cleanToken);
        } 
        else if (provider === 'issai' || provider === 'ISSAI') {
            result = await generateIssaiTTS(body, cleanToken);
        } 
        else if (provider === 'microsoft' || provider === 'Microsoft') {
            result = await generateMicrosoftTTS(text, voice_id, rate, pitch);
        }
        else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Белгісіз провайдер" }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error("TTS Main Error:", error.message);
        const status = error.response ? error.response.status : 500;
        let detail = error.message;

        if (error.response && error.response.data) {
            try {
                const rawData = error.response.data;
                if (Buffer.isBuffer(rawData)) {
                    detail = rawData.toString('utf8');
                } else if (typeof rawData === 'object') {
                    detail = JSON.stringify(rawData);
                } else {
                    detail = String(rawData);
                }
            } catch (e) {
                detail = "Error detail parsing failed";
            }
        }

        return {
            statusCode: status,
            headers,
            body: JSON.stringify({
                status: "error",
                message: "TTS серверінде қате",
                detail: detail
            })
        };
    }
};