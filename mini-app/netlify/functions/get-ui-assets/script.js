
// tg is already declared in the main shell
var voicesData = null;
var selectedVoiceId = null;
var currentLangFilter = 'all';
var appLang = 'kk';
var currentAudio = null;
var currentPlayBtn = null;
var currentVoiceObj = null;
var currentLangObj = null;
var currentLangCode = null;
var selectedEmotion = 'neutral';
var currentViewingProvider = null;
var filterMode = 'lang'; 
var activeFilter = 'all';

var token_i = localStorage.getItem('token_i') || null;
var token_e = localStorage.getItem('token_e') || null;

function getParamFromUrl(name) {
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    let results = regex.exec(window.location.search);
    if (!results) results = regex.exec(window.location.hash);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function showToast(message) {
    const toast = document.getElementById("toast-notification");
    toast.textContent = message;
    toast.className = "toast show";
    
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
}

var incomingTokenI = getParamFromUrl('token_i');
var incomingTokenE = getParamFromUrl('token_e');

function useCloudStorage() {
    return tg.isVersionAtLeast('6.9');
}

if (incomingTokenI) {
    token_i = incomingTokenI;
    localStorage.setItem('token_i', token_i);
    saveSettingsToSupabase({ provider: 'ISSAI', issai_token: token_i }); 
    if (useCloudStorage()) tg.CloudStorage.setItem('token_i', token_i, () => {});
    filterMode = 'provider';
    activeFilter = 'ISSAI';
    setTimeout(() => showToast("ISSAI кілті сақталды!"), 500);
}

if (incomingTokenE) {
    token_e = incomingTokenE;
    localStorage.setItem('token_e', token_e);
    saveSettingsToSupabase({ provider: 'ElevenLabs', elevenlabs_token: token_e }); 
    if (useCloudStorage()) tg.CloudStorage.setItem('token_e', token_e, () => {});
    filterMode = 'provider';
    activeFilter = 'ElevenLabs';
    setTimeout(() => showToast("ElevenLabs кілті сақталды!"), 500);
}

async function initializeApp() {
    const initData = tg.initData;
    if (!initData) {
        loadVoicesData();
        return;
    }

    try {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code) {
            const userLang = tg.initDataUnsafe.user.language_code.split('-')[0];
            if (['kk', 'ru', 'en'].includes(userLang)) appLang = userLang;
        }

        const response = await fetch('/api/get-settings', {
            method: 'POST',
            body: JSON.stringify({ initData })
        });
        const result = await response.json();

        let dbVoice = null;
        if (result.success && result.settings) {
            const s = result.settings;
            dbVoice = s.voice;
            if (s.issai_token) {
                token_i = s.issai_token;
                localStorage.setItem('token_i', token_i);
            }
            if (s.elevenlabs_token) {
                token_e = s.elevenlabs_token;
                localStorage.setItem('token_e', token_e);
            }
            updateProfileUI();
        }

        const urlVoice = getParamFromUrl('voice');
        const targetVoice = urlVoice || dbVoice;
        
        changeAppLanguage(appLang);
        loadVoicesData(targetVoice);
    } catch (e) {
        console.error("Initialize Error:", e);
        changeAppLanguage(appLang);
        loadVoicesData();
    }
}

async function saveSettingsToSupabase(settings) {
    const initData = tg.initData;
    if (!initData) return;

    try {
        await fetch('/api/save-settings', {
            method: 'POST',
            body: JSON.stringify({ initData, settings })
        });
    } catch (e) {
        console.error("Supabase Save Error:", e);
    }
}

var screenList = document.getElementById('screen-list');
var screenSettings = document.getElementById('screen-settings');
var screenAccountDetails = document.getElementById('screen-account-details');
var filterContainer = document.getElementById('filterContainer');
var voiceList = document.getElementById('voiceList');
var profileModal = document.getElementById('profileModal');
var modalContent = document.getElementById('modalContent');
var profileTrigger = document.getElementById('profileTrigger');
var closeProfile = document.getElementById('closeProfile');

var standardControls = document.getElementById('standard-controls');
var issaiControls = document.getElementById('issai-controls');
var elevenControls = document.getElementById('elevenlabs-controls');

var apiIssaiItem = document.getElementById('apiIssaiItem');
var apiElevenItem = document.getElementById('apiElevenItem');

var uiTranslations = {
    kk: { 
        speed: "Сөйлеу жылдамдығы", pitch: "Тональдығы", btn: "Дыбыстау", search: "Дауысты іздеу...",  
        catLang: "Тілдер", catProv: "Провайдер", all: "Барлығы",
        female: "Әйел", male: "Ер", back: "Артқа", profile: "Қызметтер", settings: "Баптаулар", langName: "Қазақ тілі", 
        keyConfig: "API Баптау", save: "Сақтау", deleteKey: "Өшіру", getKey: "Кілтті алу", apiKeyLabel: "API Кілті:",
        keyPlaceholder: "Кілтті осы жерге қойыңыз...",
        configured: "Орнатылған", notConfigured: "Орнатылмаған",
        loginReq: "API Key қажет", 
        "kk-KZ": "Қазақ", "ru-RU": "Орыс", "en-US": "Ағылшын",
        emotion: "Эмоция", tags: "Тегтер (көшіру)", 
        stability: "Тұрақтылық", similarity: "Ұқсастық",
        total: "Барлығы", remaining: "Қалғаны", unlimited: "Шексіз",
        emotions: { neutral: "Бейтарап", angry: "Ашулы", fearful: "Қорқақ", happy: "Қуанышты", sad: "Қайғылы", surprised: "Таңқалған", disgusted: "Жеккөрген" },
        tagNames: { laugh: "Күлу", cough: "Жөтелу", sigh: "Күрсіну", sniffle: "Мұрын тарту", gasp: "Ах ету", stutter: "Тұтығу", whisper: "Сыбырлау" }
    },
    ru: { 
        speed: "Скорость речи", pitch: "Тональность", btn: "Озвучить", search: "Поиск голоса...", 
        catLang: "Языки", catProv: "Провайдер", all: "Все",
        female: "Женский", male: "Мужской", back: "Назад", profile: "Сервисы", settings: "Настройки", langName: "Русский", 
        keyConfig: "Настройка API", save: "Сохранить", deleteKey: "Удалить", getKey: "Получить ключ", apiKeyLabel: "API Ключ:",
        keyPlaceholder: "Вставьте ключ здесь...",
        configured: "Настроен", notConfigured: "Не настроен",
        loginReq: "Нужен API Key", 
        "kk-KZ": "Казахский", "ru-RU": "Русский", "en-US": "Английский",
        emotion: "Эмоция", tags: "Теги (копировать)", 
        stability: "Стабильность", similarity: "Сходство",
        total: "Всего", remaining: "Осталось", unlimited: "Безлимитно",
        emotions: { neutral: "Нейтральный", angry: "Злой", fearful: "Испуганный", happy: "Радостный", sad: "Грустный", surprised: "Удивленный", disgusted: "Отвращение" },
        tagNames: { laugh: "Смех", cough: "Кашель", sigh: "Вздох", sniffle: "Шмыганье", gasp: "Резкий вздох", stutter: "Заикание", whisper: "Шепот" },
    },
    en: { 
        speed: "Speech Speed", pitch: "Tonality", btn: "Synthesize", search: "Search voice...", 
        catLang: "Languages", catProv: "Providers", all: "All",
        female: "Female", male: "Male", back: "Back", profile: "Services", settings: "Settings", langName: "English", 
        keyConfig: "API Configuration", save: "Save", deleteKey: "Delete", getKey: "Get Key", apiKeyLabel: "API Key:",
        keyPlaceholder: "Paste your API key here...",
        configured: "Configured", notConfigured: "Not Configured",
        loginReq: "API Key required", 
        "kk-KZ": "Kazakh", "ru-RU": "Russian", "en-US": "English",
        emotion: "Emotion", tags: "Tags (tap to copy)", 
        stability: "Stability", similarity: "Similarity",
        total: "Total", remaining: "Remaining", unlimited: "Unlimited",
        emotions: { neutral: "Neutral", angry: "Angry", fearful: "Fearful", happy: "Happy", sad: "Sad", surprised: "Surprised", disgusted: "Disgusted" },
        tagNames: { laugh: "Laugh", cough: "Cough", sigh: "Sigh", sniffle: "Sniffle", gasp: "Gasp", stutter: "Stutter", whisper: "Whisper" }
    }
};

function maskKey(s) {
    if (!s) return "";
    if (s.length <= 10) return s;
    return s.substring(0, 6) + "..." + s.substring(s.length - 4);
}

function openApiSettings(provider) {
    currentViewingProvider = provider;
    const t = uiTranslations[appLang];
    setTxt('accDetailTitle', `${provider} API`);
    
    const input = document.getElementById('apiKeyInput');
    if (input) input.placeholder = t.keyPlaceholder;

    const helpText = document.getElementById('apiHelpText');
    if (helpText) helpText.classList.add('hidden');
    const existingKey = provider === 'ElevenLabs' ? token_e : token_i;
    input.value = existingKey || '';

    const getKeyLink = document.getElementById('getKeyLink');
    const getKeyText = document.getElementById('getKeyText');
    const apiKeyLabelText = document.getElementById('apiKeyLabelText');
    
    if (apiKeyLabelText) apiKeyLabelText.textContent = t.apiKeyLabel;
    
    if (getKeyLink && getKeyText) {
        if (provider === 'ElevenLabs') {
            getKeyLink.href = 'https://elevenlabs.io/app/developers/api-keys';
        } else {
            getKeyLink.href = 'https://mangisoz.nu.edu.kz/keys';
        }
        getKeyText.textContent = t.getKey;
    }

    const balanceContainer = document.getElementById('balanceContainer');
    if ((provider === 'ElevenLabs' || provider === 'ISSAI') && existingKey) {
        balanceContainer.classList.remove('hidden');
        checkApiBalance(provider, existingKey);
    } else {
        balanceContainer.classList.add('hidden');
    }

    profileModal.classList.add('hidden');
    screenAccountDetails.classList.remove('hidden');
    tg.BackButton.show();
}

async function checkApiBalance(provider, key) {
    if (!key) return;
    const balanceText = document.getElementById('det-tokens');
    if (balanceText) balanceText.textContent = "...";
    const t = uiTranslations[appLang];

    try {
        const response = await fetch('https://api-qaztts.netlify.app/.netlify/functions/check-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, token: key })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                if (provider === 'ElevenLabs') {
                    const left = data.tokens_left;
                    const limit = data.details.limit;
                    const unit = appLang === 'kk' ? 'таңба' : (appLang === 'ru' ? 'символов' : 'characters');
                    balanceText.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <span style="opacity: 0.7; font-size: 14px;">${t.total}</span>
                            <span style="font-weight: 700; font-size: 16px;">${limit.toLocaleString()} ${unit}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="opacity: 0.7; font-size: 14px;">${t.remaining}</span>
                            <span style="font-weight: 800; color: #ffffff; font-size: 20px;">${left.toLocaleString()}</span>
                        </div>
                    `;
                } else {
                    balanceText.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="opacity: 0.7; font-size: 14px;">Status</span>
                            <span style="font-weight: 700; color: #4cd964; font-size: 18px;">${t.unlimited}</span>
                        </div>
                    `;
                }
            } else {
                balanceText.textContent = "Error";
            }
        } else {
            balanceText.textContent = "Invalid Key";
        }
    } catch (error) {
        console.error("Balance check error:", error);
        if (balanceText) balanceText.textContent = "Check failed";
    }
}

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentPlayBtn) currentPlayBtn.classList.replace('fa-circle-stop', 'fa-circle-play');
        currentAudio = null;
        currentPlayBtn = null;
    }
}

function playVoiceSample(e, langCode, voiceId) {
    if (e) e.stopPropagation();
    let clickedBtn = e ? e.target : null;
    if (clickedBtn && !clickedBtn.classList.contains('fa-solid')) clickedBtn = clickedBtn.querySelector('.fa-solid');

    let provider = null;
    if (voicesData && voicesData.languages[langCode]) {
        const voice = voicesData.languages[langCode].voices.find(v => v.id === voiceId);
        if (voice) provider = voice.provider;
    }

    let audioPath = "";
    if (provider === "ISSAI") audioPath = `samples/${voiceId.toLowerCase()}.wav`;
    else if (provider === "ElevenLabs") audioPath = `samples/${voiceId}.mp3`;
    else audioPath = `samples/${langCode}-${voiceId}.mp3`;

    if (currentAudio) {
        const isSame = currentPlayBtn === clickedBtn;
        stopCurrentAudio();
        if (isSame) return;
    }

    currentAudio = new Audio(audioPath);
    currentPlayBtn = clickedBtn;
    if (clickedBtn) clickedBtn.classList.replace('fa-circle-play', 'fa-circle-stop');
    currentAudio.play().catch(() => { if (clickedBtn) clickedBtn.classList.replace('fa-circle-stop', 'fa-circle-play'); });
}

function setTxt(id, txt, isQuery = false) {
    const el = isQuery ? document.querySelector(id) : document.getElementById(id);
    if (el) el.textContent = txt;
}

function copyTag(tag) {
    const textarea = document.createElement('textarea');
    textarea.value = tag;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        tg.showPopup({ message: `${tag}`, buttons: [{type: "ok"}] });
    } catch (err) {}
    document.body.removeChild(textarea);
}

function renderEmotions() {
    const select = document.getElementById('emotionSelect');
    if (!select) return;
    select.innerHTML = '';
    const emotionKeys = ['neutral', 'angry', 'fearful', 'happy', 'sad', 'surprised', 'disgusted'];
    emotionKeys.forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.text = uiTranslations[appLang].emotions[key];
        if (selectedEmotion === key) option.selected = true;
        select.appendChild(option);
    });
    select.onchange = (e) => { selectedEmotion = e.target.value; };
}

function changeAppLanguage(lang) {
    appLang = lang;
    const t = uiTranslations[lang];
    const sInput = document.getElementById('search'); if(sInput) sInput.placeholder = t.search;
    
    setTxt('.lng-speed', t.speed, true);
    setTxt('.lng-tonality', t.pitch, true);
    setTxt('submitBtn', t.btn);
    setTxt('.lng-emotion', t.emotion, true);
    setTxt('.lng-tags', t.tags, true);
    setTxt('.lng-stability', t.stability, true);
    setTxt('.lng-similarity', t.similarity, true);
 
    document.querySelectorAll('.tag-chip').forEach(chip => {
        const key = chip.getAttribute('data-key');
        if (t.tagNames && t.tagNames[key]) chip.textContent = t.tagNames[key];
    });

    const bBtn = document.getElementById('backBtn'); if(bBtn) bBtn.innerHTML = `<i class="fa-solid fa-arrow-left"></i> ${t.back}`;
    const abBtn = document.getElementById('accBackBtn'); if(abBtn) abBtn.innerHTML = `<i class="fa-solid fa-arrow-left"></i> ${t.profile}`;
    
    setTxt('setting-lang-name', t.langName);
    const sFlag = document.getElementById('setting-lang-flag'); if(sFlag) sFlag.src = `img/${lang}.svg`;
    
    setTxt('modalTitle', t.profile);
    setTxt('saveKeyBtn', t.save);
    setTxt('deleteKeyBtn', t.deleteKey);
    const getKeyText = document.getElementById('getKeyText');
    if (getKeyText) getKeyText.textContent = t.getKey;
    const apiKeyLabelText = document.getElementById('apiKeyLabelText');
    if (apiKeyLabelText) apiKeyLabelText.textContent = t.apiKeyLabel;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-lang') === lang));
    
    updateProfileUI();
    renderFilters();
    renderVoices();
    renderEmotions();
    if (currentVoiceObj) { updateSidebarInfo(); checkProviderControls(); }
}

function updateProfileUI() {
    const t = uiTranslations[appLang];
    const issaiStatus = document.getElementById('status-issai');
    if(issaiStatus) issaiStatus.textContent = token_i ? t.configured : t.notConfigured;
    if(issaiStatus) issaiStatus.style.color = token_i ? '#4cd964' : 'var(--text-gray)';

    const elevenStatus = document.getElementById('status-eleven');
    if(elevenStatus) elevenStatus.textContent = token_e ? t.configured : t.notConfigured;
    if(elevenStatus) elevenStatus.style.color = token_e ? '#4cd964' : 'var(--text-gray)';
}

function findAndSelectVoiceFromUrl(voiceNameOrId) {
    if (!voicesData || !voiceNameOrId) return;
    let foundVoice = null;
    let foundLangData = null;
    let foundLangCode = null;
    const targetLower = voiceNameOrId.toLowerCase();

    Object.entries(voicesData.languages).forEach(([langCode, langData]) => {
        if (!foundVoice) {
            const voice = langData.voices.find(v => {
                const fullId = `${langCode}-${v.id}`;
                return v.id === voiceNameOrId || 
                       fullId === voiceNameOrId || 
                       v.name.toLowerCase() === targetLower;
            });
            if (voice) { 
                foundVoice = voice; 
                foundLangData = langData; 
                foundLangCode = langCode; 
            }
        }
    });

    if (foundVoice) {
        selectedVoiceId = foundVoice.id;
        currentVoiceObj = foundVoice;
        currentLangObj = foundLangData;
        currentLangCode = foundLangCode;
        selectedEmotion = 'neutral';
        
        filterMode = 'provider';
        activeFilter = foundVoice.provider;
        
        renderFilters();
        renderVoices();
        updateSidebarInfo();
        checkProviderControls();
        setTimeout(() => {
            const selectedCard = document.querySelector('.voice-card.selected');
            if (selectedCard) selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}

async function loadVoicesData(targetVoiceId = null) {
    try {
        const response = await fetch('data/voices.json');
        voicesData = await response.json();
        updateProfileUI();
        renderFilters();
        renderVoices();
        if (targetVoiceId) findAndSelectVoiceFromUrl(targetVoiceId);
    } catch (e) { console.error(e); }
}

function renderFilters() {
    if (!voicesData) return;
    filterContainer.innerHTML = '';
    const t = uiTranslations[appLang];

    const headChip = document.createElement('div');
    headChip.className = `chip mode-switcher ${activeFilter === 'all' ? 'active' : ''}`;
    const text = filterMode === 'lang' ? t.catLang : t.catProv;
    headChip.innerHTML = `${text} <i class="fa-solid fa-sort" style="font-size: 10px; margin-left: 6px; opacity: 0.7;"></i>`;
    headChip.onclick = () => {
        if (activeFilter !== 'all') {
            activeFilter = 'all';
        } else {
            filterMode = (filterMode === 'lang') ? 'provider' : 'lang';
        }
        renderFilters();
        renderVoices();
    };
    filterContainer.appendChild(headChip);

    if (filterMode === 'lang') {
        Object.entries(voicesData.languages).forEach(([code, data]) => {
            const chip = document.createElement('div');
            chip.className = `chip ${activeFilter === code ? 'active' : ''}`;
            chip.innerHTML = `<img src="img/${data.flag}"> ${uiTranslations[appLang][code] || data.name}`;
            chip.onclick = () => {
                if (activeFilter === code) activeFilter = 'all';
                else activeFilter = code;
                renderFilters();
                renderVoices();
            };
            filterContainer.appendChild(chip);
        });
    } else {
        const providersSet = new Set();
        Object.values(voicesData.languages).forEach(langData => {
            langData.voices.forEach(voice => {
                if (voice.provider) providersSet.add(voice.provider);
            });
        });
        const sortedProviders = Array.from(providersSet).sort((a, b) => {
             const weights = { Microsoft: 1, ISSAI: 2, ElevenLabs: 3 };
             return (weights[a] || 99) - (weights[b] || 99);
        });
        sortedProviders.forEach(provider => {
            const chip = document.createElement('div');
            chip.className = `chip ${activeFilter === provider ? 'active' : ''}`;
            let pIcon = '';
            if(provider === 'ISSAI') pIcon = '<i class="fa-solid fa-brain"></i> ';
            if(provider === 'ElevenLabs') pIcon = '<i class="fa-solid fa-wand-magic-sparkles"></i> ';
            if(provider === 'Microsoft') pIcon = '<i class="fa-brands fa-microsoft"></i> ';

            chip.innerHTML = `${pIcon}${provider}`;
            chip.onclick = () => {
                if (activeFilter === provider) activeFilter = 'all';
                else activeFilter = provider;
                renderFilters();
                renderVoices();
            };
            filterContainer.appendChild(chip);
        });
        setTimeout(() => {
            const activeChip = filterContainer.querySelector('.chip.active');
            if (activeChip) {
                activeChip.scrollIntoView({ 
                    behavior: 'smooth', 
                    inline: 'center', 
                    block: 'nearest' 
                });
            }
        }, 100);
    }
}

function renderVoices() {
    if (!voicesData) return;
    const search = document.getElementById('search').value.toLowerCase();
    voiceList.innerHTML = '';

    let allVoices = [];
    Object.entries(voicesData.languages).forEach(([langCode, langData]) => {
        langData.voices.forEach(voice => {
            allVoices.push({
                ...voice,
                langCode: langCode,
                flag: langData.flag,
                localizedLang: uiTranslations[appLang][langCode] || langData.name
            });
        });
    });

    allVoices = allVoices.filter(v => {
        const matchSearch = v.name.toLowerCase().includes(search) || 
                          v.localizedLang.toLowerCase().includes(search);
        if (!matchSearch) return false;

        if (activeFilter !== 'all') {
            if (filterMode === 'lang' && v.langCode !== activeFilter) return false;
            if (filterMode === 'provider' && v.provider !== activeFilter) return false;
        }
        return true;
    });

    allVoices.sort((a, b) => {
        const langWeights = { 'kk-KZ': 1, 'ru-RU': 2, 'en-US': 3 };
        const langWeightA = langWeights[a.langCode] || 99;
        const langWeightB = langWeights[b.langCode] || 99;

        if (filterMode === 'provider') {
            const providerWeights = { Microsoft: 1, ISSAI: 2, ElevenLabs: 3 };
            const pA = a.provider || 'Other';
            const pB = b.provider || 'Other';
            const pWeightA = providerWeights[pA] || 99;
            const pWeightB = providerWeights[pB] || 99;

            if (pWeightA !== pWeightB) return pWeightA - pWeightB;
            if (langWeightA !== langWeightB) return langWeightA - langWeightB;
            return a.name.localeCompare(b.name);
        } else {
            if (langWeightA !== langWeightB) return langWeightA - langWeightB;
            const providerWeights = { Microsoft: 1, ISSAI: 2, ElevenLabs: 3 };
            const pA = a.provider || 'Other';
            const pB = b.provider || 'Other';
            if (pA !== pB) return (providerWeights[pA] || 99) - (providerWeights[pB] || 99);
            return a.name.localeCompare(b.name);
        }
    });

    if (allVoices.length === 0) {
        voiceList.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Дауыстар табылмады</div>`;
        return;
    }

    let lastGroupKey = null;
    allVoices.forEach(voice => {
        let currentGroupKey = (filterMode === 'provider') ? (voice.provider || 'QazTTS') : voice.localizedLang;
        if (currentGroupKey !== lastGroupKey) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'list-group-header';
            groupHeader.innerHTML = currentGroupKey;
            voiceList.appendChild(groupHeader);
            lastGroupKey = currentGroupKey;
        }

        var isLocked = (voice.provider === 'ISSAI' && !token_i) || (voice.provider === 'ElevenLabs' && !token_e);
        const isSelected = selectedVoiceId === voice.id;
        const card = document.createElement('div');
        card.className = `voice-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`;
        
        let rightContent = isLocked 
            ? `<div class="login-req-btn"><i class="fa-solid fa-lock"></i> ${uiTranslations[appLang].loginReq}</div>`
            : `${isSelected ? '<i class="fa-solid fa-circle-check selected-icon"></i>' : ''}<i class="fa-solid fa-circle-play play-icon" onclick="playVoiceSample(event, '${voice.langCode}', '${voice.id}')"></i>`;

        card.innerHTML = `
            <img src="img/${voice.flag}" class="vc-card-flag">
            <div class="vc-info">
                <div class="vc-title">${voice.name}</div>
                <div class="vc-meta">
                    <span style="color:${voice.gender === 'female' ? '#ff6b8b' : '#4da6ff'}">${voice.gender === 'female' ? uiTranslations[appLang].female : uiTranslations[appLang].male}</span> 
                    <span class="bullet">•</span> <span>${voice.localizedLang}</span> 
                    <span class="bullet">•</span> <span>${voice.provider || 'QazTTS'}</span>
                </div>
            </div>
            ${rightContent}
        `;
        card.onclick = () => { if (isLocked) openApiSettings(voice.provider); else selectVoice(voice, voicesData.languages[voice.langCode], voice.langCode); };
        voiceList.appendChild(card);
    });
}

function checkProviderControls() {
    if (!currentVoiceObj) return;
    standardControls.classList.add('hidden');
    issaiControls.classList.add('hidden');
    if(elevenControls) elevenControls.classList.add('hidden');
    if (currentVoiceObj.provider === 'ISSAI') issaiControls.classList.remove('hidden');
    else if (currentVoiceObj.provider === 'ElevenLabs' && elevenControls) elevenControls.classList.remove('hidden');
    else standardControls.classList.remove('hidden');
}

function selectVoice(voice, langData, langCode) {
    stopCurrentAudio();
    selectedVoiceId = voice.id;
    currentVoiceObj = voice;
    currentLangObj = langData;
    currentLangCode = langCode;
    selectedEmotion = 'neutral';
    renderVoices();
    renderEmotions();
    updateSidebarInfo();
    checkProviderControls();
    screenList.classList.add('hidden');
    screenSettings.classList.remove('hidden');
    tg.BackButton.show();
}

function updateSidebarInfo() {
    if(!currentVoiceObj) return;
    document.getElementById('st-name').textContent = currentVoiceObj.name;
    document.getElementById('st-flag').src = `img/${currentLangObj.flag}`;
    document.getElementById('st-lang').textContent = uiTranslations[appLang][currentLangCode] || currentLangObj.name;
    const genderElem = document.getElementById('st-gender');
    genderElem.textContent = currentVoiceObj.gender === 'female' ? uiTranslations[appLang].female : uiTranslations[appLang].male;
    genderElem.style.color = currentVoiceObj.gender === 'female' ? '#ff6b8b' : '#4da6ff';
    document.getElementById('st-provider').textContent = currentVoiceObj.provider || "QazTTS";
    document.getElementById('previewBtn').onclick = (e) => playVoiceSample(e, currentLangCode, currentVoiceObj.id);
}

tg.BackButton.onClick(() => {
    if (!screenSettings.classList.contains('hidden')) { screenSettings.classList.add('hidden'); screenList.classList.remove('hidden'); tg.BackButton.hide(); } 
    else if (!screenAccountDetails.classList.contains('hidden')) { screenAccountDetails.classList.add('hidden'); profileModal.classList.remove('hidden'); }
});

document.getElementById('backBtn').onclick = () => { screenSettings.classList.add('hidden'); screenList.classList.remove('hidden'); tg.BackButton.hide(); };

profileTrigger.onclick = () => {
    profileModal.classList.remove('hidden');
    modalContent.style.transform = 'translateY(0)';
    profileModal.style.opacity = '1';
    updateProfileUI();
};

function closeMainModal() { modalContent.style.transform = 'translateY(100%)'; profileModal.style.opacity = '0'; setTimeout(() => { profileModal.classList.add('hidden'); }, 300); }
closeProfile.onclick = closeMainModal;

if (apiIssaiItem) apiIssaiItem.onclick = () => openApiSettings('ISSAI');
if (apiElevenItem) apiElevenItem.onclick = () => openApiSettings('ElevenLabs');

document.getElementById('accBackBtn').onclick = () => { screenAccountDetails.classList.add('hidden'); profileModal.classList.remove('hidden'); };

document.getElementById('saveKeyBtn').onclick = () => {
    const newVal = document.getElementById('apiKeyInput').value.trim();
    if (!newVal) { showToast("Кілт бос болмауы керек!"); return; }
    
    if (currentViewingProvider === 'ElevenLabs') {
        token_e = newVal;
        localStorage.setItem('token_e', newVal);
        if (useCloudStorage()) tg.CloudStorage.setItem('token_e', newVal, () => {});
        showToast("ElevenLabs сақталды!");
        checkApiBalance('ElevenLabs', newVal);
    } else {
        token_i = newVal;
        localStorage.setItem('token_i', newVal);
        if (useCloudStorage()) tg.CloudStorage.setItem('token_i', newVal, () => {});
        showToast("ISSAI сақталды!");
        checkApiBalance('ISSAI', newVal);
    }
    const settingsToSave = { provider: currentViewingProvider };
    if (currentViewingProvider === 'ElevenLabs') settingsToSave.elevenlabs_token = newVal;
    else settingsToSave.issai_token = newVal;
    saveSettingsToSupabase(settingsToSave);
    updateProfileUI();
    renderVoices();
};

document.getElementById('deleteKeyBtn').onclick = () => {
    if (currentViewingProvider === 'ElevenLabs') {
        token_e = null;
        localStorage.removeItem('token_e');
        if (useCloudStorage()) tg.CloudStorage.removeItem('token_e', () => {});
        showToast("ElevenLabs өшірілді!");
    } else {
        token_i = null;
        localStorage.removeItem('token_i');
        if (useCloudStorage()) tg.CloudStorage.removeItem('token_i', () => {});
        showToast("ISSAI өшірілді!");
    }
    const settingsToSave = { provider: currentViewingProvider };
    if (currentViewingProvider === 'ElevenLabs') settingsToSave.elevenlabs_token = null;
    else settingsToSave.issai_token = null;
    saveSettingsToSupabase(settingsToSave);
    document.getElementById('apiKeyInput').value = '';
    updateProfileUI();
    renderVoices();
};

document.querySelectorAll('.tab-btn').forEach(btn => { btn.onclick = () => changeAppLanguage(btn.getAttribute('data-lang')); });

var rateInput = document.getElementById('rate');
if (rateInput) rateInput.oninput = (e) => document.getElementById('rate-val').textContent = (e.target.value >= 0 ? "+" : "") + e.target.value + "%";
var pitchInput = document.getElementById('pitch');
if (pitchInput) pitchInput.oninput = (e) => document.getElementById('pitch-val').textContent = (e.target.value >= 0 ? "+" : "") + e.target.value + "Hz";
var stabRange = document.getElementById('stability');
if(stabRange) stabRange.oninput = (e) => document.getElementById('stability-val').textContent = (e.target.value / 100).toFixed(2);
var simRange = document.getElementById('similarity');
if(simRange) simRange.oninput = (e) => document.getElementById('similarity-val').textContent = (e.target.value / 100).toFixed(2);

document.getElementById('submitBtn').onclick = async () => { 
    if (!selectedVoiceId) return;
    let data = { voice: selectedVoiceId };

    if (currentVoiceObj.provider === 'ElevenLabs') {
        if (!token_e) { showToast("ElevenLabs кілті енгізілмеген!"); openApiSettings('ElevenLabs'); return; }
        data.provider = 'ElevenLabs';
        data.token = token_e;
        const stabVal = document.getElementById('stability')?.value || 50;
        const simVal = document.getElementById('similarity')?.value || 75;
        data.stability = parseFloat(stabVal) / 100;
        data.similarity = parseFloat(simVal) / 100;
    } 
    else if (currentVoiceObj.provider === 'ISSAI') {
        if (!token_i) { showToast("ISSAI кілті енгізілмеген!"); openApiSettings('ISSAI'); return; }
        data.provider = 'ISSAI';
        data.token = token_i;
        data.emotion = selectedEmotion;
    } 
    else {
        data.voice = `${currentLangCode}-${selectedVoiceId}`;
        data.provider = 'Microsoft';
        data.rate = document.getElementById('rate').value;
        data.pitch = document.getElementById('pitch').value;
    }
    const settingsToSave = {
        voice: data.voice,
        provider: data.provider,
        rate: data.rate || "+0",
        pitch: data.pitch || "+0",
        emotion: data.emotion || "neutral",
        issai_token: token_i,
        elevenlabs_token: token_e
    };
    
    showToast(appLang === 'kk' ? "Сақталуда..." : (appLang === 'ru' ? "Сохранение..." : "Saving..."));
    await saveSettingsToSupabase(settingsToSave);
    showToast(appLang === 'kk' ? "Сақталды! ✅" : (appLang === 'ru' ? "Сохранено! ✅" : "Saved! ✅"));
    
    setTimeout(() => {
        tg.close();
    }, 600);
};

document.getElementById('search').oninput = renderVoices;

function syncWithCloud() {
    if (!useCloudStorage()) return;
    const keys = ['token_i', 'token_e'];
    tg.CloudStorage.getItems(keys, (err, values) => {
        if (err) return;
        let updated = false;
        if (values.token_i && values.token_i !== token_i) { token_i = values.token_i; localStorage.setItem('token_i', token_i); updated = true; }
        if (values.token_e && values.token_e !== token_e) { token_e = values.token_e; localStorage.setItem('token_e', token_e); updated = true; }
        if (updated) { updateProfileUI(); renderVoices(); showToast("Кілттер синхрондалды ✅"); }
    });
}
initializeApp();
syncWithCloud();

var toggleEye = document.getElementById('toggleApiVisibility');
var apiInput = document.getElementById('apiKeyInput');

if (toggleEye && apiInput) {
    toggleEye.onclick = function() {
        if (apiInput.type === 'password') {
            apiInput.type = 'text';
            toggleEye.classList.replace('fa-eye-slash', 'fa-eye');
        } else {
            apiInput.type = 'password';
            toggleEye.classList.replace('fa-eye', 'fa-eye-slash');
        }
    };
}
