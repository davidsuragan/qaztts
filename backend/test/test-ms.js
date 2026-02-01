const generateMicrosoftTTS = require('../netlify/functions/provider/microsoft');

async function testMicrosoftTTS() {
    console.log("--- Microsoft (Edge TTS) Тексеру басталды ---");

    const text = "Сәлем! Бұл Microsoft Edge TTS провайдерінің жұмысын тексеру.";
    const voice = "kk-KZ-AigulNeural";
    const rate = "+0%";
    const pitch = "+0Hz";

    try {
        const result = await generateMicrosoftTTS(text, voice, rate, pitch);

        console.log("✅ Сәтті!");
        console.log("Status:", result.status);
        console.log("Format:", result.format);
        console.log("Duration:", result.duration.toFixed(2), "секунд");
        console.log("Audio Base64 ұзындығы:", result.audioBase64.length, "символ");
        console.log("Басы (Base64):", result.audioBase64.substring(0, 50) + "...");
        
        if (result.offsets && result.offsets.length > 0) {
            console.log("Offsets табылды:", result.offsets.length, "сөз");
            console.log("Бірінші сөз:", result.offsets[0]);
        }

    } catch (error) {
        console.error("❌ Қате орын алды:", error.message);
    }
}

testMicrosoftTTS();
