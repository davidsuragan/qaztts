// test-elevenlabs.js - ElevenLabs провайдерін тестілеу
const { handler } = require('../netlify/functions/tts');

// !!! ОСЫ ЖЕРГЕ ELEVENLABS ТОКЕНДІ ҚОЙ !!!
const ELEVENLABS_TOKEN = "0e8b780010a04de2cc22424e02a01d26a6b57cc94579c7f021ee0a0119f3f6b2"; 

const fakeEvent = {
    httpMethod: 'POST',
    headers: {
        origin: 'http://127.0.0.1:5500',
        authorization: `Bearer ${ELEVENLABS_TOKEN}`
    },
    body: JSON.stringify({
        provider: 'elevenlabs',
        text: 'Hello, this is a test voice from ElevenLabs.',
        voice_id: 'cgSgspJ2msm6clMCkdW9' // ElevenLabs дауыс ID
    })
};


handler(fakeEvent, {})
    .then(response => {
        console.log("\n--- НӘТИЖЕ ---");
        console.log("Status Code:", response.statusCode);
        
        const body = JSON.parse(response.body);
        console.log("Жауап:", JSON.stringify(body, null, 2));
        
        if (body.status === 'success') {
            console.log("\n✅ Сәтті! Аудио деректері:");
            console.log("  - Audio Base64 ұзындығы:", body.audioBase64 ? body.audioBase64.length : 0, "символ");
        } else if (body.error) {
            console.log("\n❌ Қате:", body.error);
        }
    })
    .catch(error => {
        console.error("\n--- ҚАТЕ ---");
        console.error(error);
    });
