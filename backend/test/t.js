// test-tts.js
const { handler } = require('../netlify/functions/tts');

const MY_TOKEN = "ak_Zjd_D1JrUgfLac0nP_nNSAbR7qk_JGdwelRIv2LOjLA"; 
const fakeEvent = {
    httpMethod: 'POST',
    headers: {
        origin: 'http://127.0.0.1:5500',
        authorization: `Bearer ${MY_TOKEN}`
    },
    body: JSON.stringify({
        provider: 'issai',
        text: 'Сәлем, қалайсың бауырым? Бұл тест дауысы.',
        voice: 'marzhan',  
        language: 'kk',     
        emotion: 'neutral'
    })
};

console.log("TTS Тексеру басталды...");

handler(fakeEvent, {})
    .then(response => {
        console.log("--- НӘТИЖЕ ---");
        console.log("Status Code:", response.statusCode);
        
        const body = JSON.parse(response.body);
        console.log("Жауап:", JSON.stringify(body, null, 2));
        
        if (body.status === 'success') {
            console.log("\n✅ Сәтті! Аудио деректері:");
            const b64 = body.audioBase64 || body.audio_base_64;
            console.log("  - Audio Base64 ұзындығы:", b64 ? b64.length : 0, "символ");
            console.log("  - Audio URL:", body.audio_url);
            console.log("  - File ID:", body.file_id);
            console.log("  - Ұзақтығы:", body.duration_seconds, "секунд");
            console.log("  - Дауыс:", body.voice);
            console.log("  - Тіл:", body.language);
            console.log("  - Эмоция:", body.emotion);
        } else if (body.error) {
            console.log("\n❌ Қате:", body.error);
        } else {
            console.log("\n⚠️ Белгісіз жауап форматы");
        }
    })
    .catch(error => {
        console.error("\n--- ҚАТЕ ---");
        console.error(error);
    });