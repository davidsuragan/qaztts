/**
 * CORS конфигурациясы - барлық Netlify функциялары үшін
 */

const allowedOrigins = [
    "https://elevenlabs-qaztts.netlify.app",
    "https://qaztts.netlify.app",
    "https://bot-qaztts.vercel.app",
    "http://127.0.0.1:5500",
];

/**
 * CORS headers-ті қайтарады
 * @param {string} origin - Request-тен келген origin
 * @param {string[]} methods - Рұқсат етілген HTTP методтар (мысалы: ['GET', 'POST', 'OPTIONS'])
 * @returns {Object} CORS headers
 */
function getCorsHeaders(origin, methods = ['GET', 'POST', 'OPTIONS']) {
    const isAllowed = allowedOrigins.includes(origin);
    
    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': methods.join(', '),
        'Content-Type': 'application/json'
    };
}

/**
 * OPTIONS request-ті өңдейді (preflight)
 * @param {Object} event - Netlify event объектісі
 * @param {string[]} methods - Рұқсат етілген HTTP методтар
 * @returns {Object} Response объектісі
 */
function handleOptionsRequest(event, methods = ['GET', 'POST', 'OPTIONS']) {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin, methods);
    
    return {
        statusCode: 200,
        headers,
        body: ''
    };
}

module.exports = {
    allowedOrigins,
    getCorsHeaders,
    handleOptionsRequest
};
