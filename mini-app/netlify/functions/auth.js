const crypto = require('crypto');

exports.handler = async (event) => {
    try {
        if (event.httpMethod !== "POST") {
            return { statusCode: 405, body: "Method Not Allowed" };
        }

        const body = JSON.parse(event.body || "{}");
        const initData = body.initData;
        
        const token1 = process.env.BOT_TOKEN;
        const token2 = process.env.LOCAL_BOT_TOKEN;

        if (!initData || (!token1 && !token2)) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ success: false, code: "AUTH_MISSING_DATA" }) 
            };
        }

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();
        
        let dataCheckString = "";
        for (const [key, value] of urlParams.entries()) {
            dataCheckString += `${key}=${value}\n`;
        }
        dataCheckString = dataCheckString.slice(0, -1);

        const verifyHash = (token) => {
            if (!token) return false;
            const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
            const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
            return calculatedHash === hash;
        };

        const isValid = verifyHash(token1) || verifyHash(token2);

        if (!isValid) {
            return { 
                statusCode: 403, 
                body: JSON.stringify({ success: false, code: "AUTH_INVALID_HASH" }) 
            };
        }

        const userData = JSON.parse(urlParams.get('user') || "{}");
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, user: userData })
        };

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ success: false, code: "AUTH_SERVER_ERROR" }) 
        };
    }
};
