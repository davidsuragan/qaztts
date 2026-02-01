const axios = require('axios');

async function generateElevenLabsTTS(text, voiceId, token) {
    const voice = voiceId || "cgSgspJ2msm6clMCkdW9";
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;

    try {
        const response = await axios.post(
            url,
            {
                text: text,
                model_id: "eleven_v3_dpo",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                }
            },
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': token
                },
                responseType: 'arraybuffer'
            }
        );
        const audioData = Buffer.from(response.data, 'binary').toString('base64');
        
        return { 
            status: "success", 
            audioBase64: audioData 
        };

    } catch (error) {
        console.error("ElevenLabs TTS Error:", error.message);

        if (error.response) {
            let errorBody = "";
            try {
                const bufferData = Buffer.from(error.response.data);
                errorBody = bufferData.toString('utf8');
            } catch (e) {
                errorBody = "Cannot parse error body";
            }
            
            console.error("API Response Status:", error.response.status);
            console.error("API Response Body:", errorBody);
            
            const customError = new Error(errorBody || error.message);
            customError.response = {
                status: error.response.status, 
                data: errorBody
            };

            throw customError;
        }
        
        throw error;
    }
}

module.exports = generateElevenLabsTTS;
