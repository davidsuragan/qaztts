let tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

async function authenticateApp() {
    const isTelegram = tg.platform && tg.platform !== 'unknown';

    if (!isTelegram) {
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Inter,sans-serif;text-align:center;padding:20px;background:#050505;color:white;">
                <i class="fa-solid fa-mobile-screen-button" style="font-size:50px;color:#007aff;margin-bottom:20px;"></i>
                <h1 style="font-size:20px;margin-bottom:10px;">Тек смартфонда қолжетімді</h1>
                <p style="color:#888;font-size:14px;">Өтініш, Telegram қосымшасы арқылы кіріңіз.</p>
            </div>`;
        return;
    }

    let user = { id: 0, first_name: "Telegram User" };
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
    }

    const existingLoader = document.getElementById('auth-loading');

    try {
        const authResponse = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData })
        });

        if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(getErrorMessage(errorData.code));
        }

        const authResult = await authResponse.json();
        const authenticatedUser = authResult.user || user;

        const uiResponse = await fetch('/api/get-ui', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }) 
        });
        
        if (uiResponse.ok) {
            const uiHtml = await uiResponse.text();
            if (existingLoader) {
                existingLoader.remove();
            }
            injectAppUI(uiHtml, authenticatedUser);
        } else {
            throw new Error(getErrorMessage("INIT_ERROR"));
        }
    } catch (e) {
        console.error("Auth/Load Error:", e);
        if (existingLoader) {
            existingLoader.innerHTML = `<p style="color:#ff3b30; padding: 20px;">${e.message || "Жүктеу қатесі..."}</p>`;
        }
    }
}

function injectAppUI(htmlContent, user) {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const scripts = Array.from(tempDiv.querySelectorAll('script'));
    const styles = Array.from(tempDiv.querySelectorAll('style'));

    styles.forEach(style => {
        const newStyle = document.createElement('style');
        newStyle.textContent = style.textContent;
        document.head.appendChild(newStyle);
        style.remove();
    });

    while (tempDiv.firstChild) {
        if (tempDiv.firstChild.tagName !== 'SCRIPT') {
            appContainer.appendChild(tempDiv.firstChild);
        } else {
            tempDiv.removeChild(tempDiv.firstChild);
        }
    }

    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
    });
    
    setTimeout(() => {
        if (typeof initializeApp === 'function') {
            localStorage.setItem('tg_user', JSON.stringify(user));
            initializeApp(user);
        }
        const params = new URLSearchParams(window.location.search);
        const tv = params.get('voice');
        if (tv && typeof loadVoicesData === 'function') loadVoicesData(tv);
    }, 100);
}

document.addEventListener('DOMContentLoaded', authenticateApp);

const errorMessages = {
    kk: {
        AUTH_MISSING_DATA: "Деректер жетіспейді (initData)",
        AUTH_INVALID_HASH: "Авторизациядан өтпеді (Invalid hash)",
        AUTH_SERVER_ERROR: "Серверлік қате (Auth)",
        SAVE_MISSING_CONFIG: "Конфигурация қатесі",
        SAVE_INVALID_AUTH: "Сақтауға рұқсат жоқ",
        SAVE_SERVER_ERROR: "Деректерді сақтау мүмкін болмады",
        INIT_ERROR: "Жүйені іске қосу қатесі"
    },
    ru: {
        AUTH_MISSING_DATA: "Данные отсутствуют (initData)",
        AUTH_INVALID_HASH: "Ошибка авторизации (Invalid hash)",
        AUTH_SERVER_ERROR: "Серверная ошибка (Auth)",
        SAVE_MISSING_CONFIG: "Ошибка конфигурации",
        SAVE_INVALID_AUTH: "Нет доступа для сохранения",
        SAVE_SERVER_ERROR: "Не удалось сохранить данные",
        INIT_ERROR: "Ошибка инициализации"
    },
    en: {
        AUTH_MISSING_DATA: "Missing data (initData)",
        AUTH_INVALID_HASH: "Authentication failed (Invalid hash)",
        AUTH_SERVER_ERROR: "Server error (Auth)",
        SAVE_MISSING_CONFIG: "Configuration error",
        SAVE_INVALID_AUTH: "No permission to save",
        SAVE_SERVER_ERROR: "Failed to save data",
        INIT_ERROR: "Initialization error"
    }
};

function getErrorMessage(code) {
    const lang = (window.appLang) || 'kk';
    return (errorMessages[lang] && errorMessages[lang][code]) || code || "Unknown error";
}
