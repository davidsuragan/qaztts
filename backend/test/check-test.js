const { handler } = require('../netlify/functions/check-balance');

const ELEVEN_TOKEN = "API_KEY_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const ISSAI_TOKEN = "API_KEY_YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY";

async function testBalance(provider, token) {
    console.log(`\n--- ${provider} тексеру басталды ---`);
    
    const fakeEvent = {
        httpMethod: 'POST',
        headers: {
            origin: 'http://localhost:3000'
        },
        body: JSON.stringify({
            provider: provider,
            token: token
        })
    };

    try {
        const response = await handler(fakeEvent, {});
        const body = JSON.parse(response.body);
        console.log(`Status Code: ${response.statusCode}`);
        console.log(`Жауап:`, JSON.stringify(body, null, 2));
    } catch (error) {
        console.error(`Қате:`, error);
    }
}

async function runTests() {
    await testBalance('ElevenLabs', ELEVEN_TOKEN);
    await testBalance('ISSAI', ISSAI_TOKEN);
}

runTests();
