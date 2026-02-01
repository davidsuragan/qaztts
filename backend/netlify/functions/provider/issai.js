const axios = require('axios');

/**
 * ISSAI (Mangisoz) Expressive TTS генерациясы
 * API Documentation: https://mangisoz.nu.edu.kz/backend/api-docs/kk
 * 
 * @param {Object} requestBody - TTS сұрау параметрлері
 * @param {string} requestBody.text - Синтезделетін мәтін
 * @param {string} requestBody.voice - Дауыс ID (мысалы: 'marzhan', 'coral', 'ballad')
 * @param {string} requestBody.language - Тіл коды (мысалы: 'kk', 'en', 'ru')
 * @param {string} requestBody.emotion - Эмоция (әдепкі: 'neutral')
 * @param {Object} requestBody.options - Қосымша параметрлер
 * @param {string} apiKey - X-API-Key аутентификация токені
 * @returns {Promise<Object>} API жауабы
 */
async function generateIssaiTTS(requestBody, apiKey) {
    const url = 'https://mangisoz.nu.edu.kz/backend/api/v1/expressive-tts/tts';
    
    // API документациясына сәйкес request body құрастыру
    const payload = {
        text: requestBody.text,
        voice: requestBody.voice || requestBody.voice_id, // voice_id-ті де қолдау
        language: requestBody.language || 'kk',
        emotion: requestBody.emotion || 'neutral',
        temperature: requestBody.temperature ?? 0.6,
        top_p: requestBody.top_p ?? 0.95,
        max_tokens: requestBody.max_tokens ?? 8192,
        repetition_penalty: requestBody.repetition_penalty ?? 1.1,
        sentences_per_chunk: requestBody.sentences_per_chunk ?? 1,
        stream: requestBody.stream ?? false
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            }
        });
        if (response.data && response.data.object === 'expressive_tts.audio') {
            const audioData = response.data.data;
            const fileId = audioData.file_id;
            
            const downloadUrl = audioData.download_url || `https://mangisoz.nu.edu.kz/backend/api/v1/expressive-tts/files/${fileId}`;

            let audioBase64 = null;
            try {
                const audioRes = await axios.get(downloadUrl, { 
                    responseType: 'arraybuffer',
                    headers: { 'X-API-Key': apiKey }
                });
                audioBase64 = Buffer.from(audioRes.data, 'binary').toString('base64');
            } catch (dlError) {
                console.error('Error downloading ISSAI audio:', dlError.message);
            }
            
            return {
                status: 'success',
                audio_base64: audioBase64,
                file_id: fileId,
                duration_seconds: audioData.duration_seconds,
                voice: audioData.voice,
                language: audioData.language,
                emotion: audioData.emotion,
                expires_in_seconds: audioData.expires_in_seconds
            };
        }

        return response.data;

    } catch (error) {
        console.error('ISSAI TTS Error:', error.message);
        
        if (error.response) {
            const errorDetail = error.response.data || {};
            throw new Error(
                `ISSAI API қатесі: ${error.response.status} - ${JSON.stringify(errorDetail)}`
            );
        }
        
        throw error;
    }
}

module.exports = generateIssaiTTS;
