const WebSocket = require('ws');
const crypto = require('crypto');

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function date_to_string() {
  const d = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${('0'+d.getUTCDate()).slice(-2)} ${d.getUTCFullYear()} ${('0'+d.getUTCHours()).slice(-2)}:${('0'+d.getUTCMinutes()).slice(-2)}:${('0'+d.getUTCSeconds()).slice(-2)} GMT+0000 (Coordinated Universal Time)`;
}

function generateMuid() {
  return crypto.randomBytes(16).toString('hex').toUpperCase();
}

function generateSecMsGec() {
  const WIN_EPOCH = 11644473600;
  const S_TO_NS = 1e9;
  let ticks = Math.floor(Date.now() / 1000);
  ticks += WIN_EPOCH;
  ticks -= ticks % 300;
  ticks = Math.floor(ticks * (S_TO_NS / 100));
  const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
  const strToHash = `${ticks}${TRUSTED_CLIENT_TOKEN}`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

function parseHeaders(headerStr) {
  const out = {};
  const lines = headerStr.split(/\r\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      out[k] = v;
    }
  }
  return out;
}

function normalizeRate(rate) {
  if (rate === undefined || rate === null || rate === "") return "+0%";
  let r = rate.toString().trim();
  if (r.includes("%")) return r.startsWith("+") || r.startsWith("-") ? r : "+" + r;
  const num = parseFloat(r);
  if (Number.isNaN(num)) return "+0%";
  return (num >= 0 ? "+" : "") + num + "%";
}

function normalizePitch(pitch) {
  if (pitch === undefined || pitch === null || pitch === "") return "+0Hz";
  let p = pitch.toString().trim();
  if (p.toLowerCase().includes("hz")) return p.startsWith("+") || p.startsWith("-") ? p : "+" + p;
  const num = parseFloat(p);
  if (Number.isNaN(num)) return "+0Hz";
  return (num >= 0 ? "+" : "") + num + "Hz";
}

function stripControlChars(s) {
  if (!s || typeof s !== "string") return s;
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

class SocketEdgeTTS {
  constructor(voice, rate, pitch, text) {
    this.voice = voice || "en-US-EmmaMultilingualNeural";
    this.rate = normalizeRate(rate);
    this.pitch = normalizePitch(pitch);
    this.text = stripControlChars((text || "").replace(/[\r\n]+/g, ' ').trim());
    this.audioData = [];
    this.socket = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.offsets = [];
    this.isFinished = false;
  }

  connect_id() {
    return crypto.randomUUID().replace(/-/g, '');
  }

  mkssml() {
    const safeText = escapeXml(this.text);
    return (
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
      `<voice name='${this.voice}'>` +
      `<prosody pitch='${this.pitch}' rate='${this.rate}' volume='+0%'>` +
      `${safeText}` +
      `</prosody></voice></speak>`
    );
  }

  download() {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
      const SEC_MS_GEC_VERSION = "1-143.0.3650.75";
      const secMsGec = generateSecMsGec();
      const connectId = this.connect_id();
      const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
      const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectId}`;
      const muid = generateMuid();
      const wsOptions = {
        headers: {
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
          "Sec-WebSocket-Version": "13",
          "Cookie": `muid=${muid};`
        }
      };
      this.socket = new WebSocket(url, wsOptions);
    //   console.log('[EdgeTTS] WebSocket қосылуда...');
      const timeoutTimer = setTimeout(() => {
        if (!this.isFinished) {
          this.isFinished = true;
          if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.terminate();
          console.error('[EdgeTTS] Timeout: 15 секунд ішінде жауап келмеді');
          this.rejectPromise(new Error("Timeout: Edge TTS жауап бермеді (15с)."));
        }
      }, 15000);
      this.socket.on('open', () => {
        // console.log('[EdgeTTS] WebSocket қосылды ✓');
        const timestamp = date_to_string();
        const config = '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":true},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
        this.socket.send(
          `X-Timestamp:${timestamp}\r\n` +
          "Content-Type:application/json; charset=utf-8\r\n" +
          "Path:speech.config\r\n\r\n" +
          config
        );
        // console.log('[EdgeTTS] Config жіберілді');
        const ssml = this.mkssml();
        // console.log('[EdgeTTS] SSML жіберілуде:', ssml);
        this.socket.send(
          `X-RequestId:${connectId}\r\n` +
          "Content-Type:application/ssml+xml\r\n" +
          `X-Timestamp:${timestamp}Z\r\n` +
          "Path:ssml\r\n\r\n" +
          ssml
        );
        // console.log('[EdgeTTS] SSML жіберілді');
      });
      this.socket.on('message', (data, isBinary) => {
        try {
          if (isBinary) {
            const buffer = Buffer.from(data);
            if (buffer.length < 2) {
            //   console.warn('[EdgeTTS] Қысқа бинарлы хабарлама келді');
              return;
            }
            const headerLength = buffer.readUInt16BE(0);
            const headerBuf = buffer.subarray(2, 2 + headerLength);
            const bodyBuf = buffer.subarray(2 + headerLength);
            const sep = Buffer.from("\r\n\r\n");
            const sepIndex = headerBuf.indexOf(sep);
            const headersText = sepIndex !== -1 ? headerBuf.slice(0, sepIndex).toString('utf8') : headerBuf.toString('utf8');
            const headers = parseHeaders(headersText);
            const path = (headers['Path'] || '').toLowerCase();
            if (path === 'audio') {
              this.audioData.push(bodyBuf);
            }
          } else {
            const message = data.toString();
            const parts = message.split("\r\n\r\n");
            const headersText = parts[0] || '';
            const body = parts.slice(1).join("\r\n\r\n");
            const headers = parseHeaders(headersText);
            const path = (headers['Path'] || '').toLowerCase();
            if (path === 'audio.metadata') {
              try {
                const metadata = JSON.parse(body);
                if (metadata.Metadata) {
                  metadata.Metadata.forEach(meta => {
                    if (meta.Type === "WordBoundary") {
                      const wordText = (meta.Data && meta.Data.text && (meta.Data.text.Text || meta.Data.text.text)) || "";
                      this.offsets.push({
                        word: wordText,
                        s: meta.Data.Offset / 10000,
                        e: (meta.Data.Offset + meta.Data.Duration) / 10000
                      });
                    }
                  });
                }
              } catch (e) {
                console.error("Metadata JSON error:", e && e.message);
              }
            } else if (path === 'turn.end') {
            //   console.log('[EdgeTTS] Аяқталды ✓ Барлығы:', this.audioData.length, 'бөлік');
              clearTimeout(timeoutTimer);
              this.isFinished = true;
              try { this.socket.close(); } catch (e) {}
              const finalBuffer = Buffer.concat(this.audioData);
              const durationSec = finalBuffer.length / 12000;
              this.resolvePromise({
                audioBuffer: finalBuffer,
                offsets: this.offsets,
                duration: durationSec,
                format: "mp3"
              });
            }
          }
        } catch (err) {
          console.error('[EdgeTTS] message handling error:', err && err.message);
        }
      });
      this.socket.on('error', (err) => {
        clearTimeout(timeoutTimer);
        if (!this.isFinished) {
          this.isFinished = true;
          console.error('[EdgeTTS] WebSocket error:', err && err.message);
          if (this.audioData.length > 0) {
            const finalBuffer = Buffer.concat(this.audioData);
            this.resolvePromise({
              audioBuffer: finalBuffer,
              offsets: this.offsets,
              duration: finalBuffer.length / 12000,
              format: "mp3"
            });
          } else {
            this.rejectPromise(err);
          }
        }
      });
      this.socket.on('close', (code, reason) => {
        clearTimeout(timeoutTimer);
        if (!this.isFinished) {
          this.isFinished = true;
        //   console.log('[EdgeTTS] WebSocket жабылды. Code:', code, 'Reason:', reason && reason.toString && reason.toString());
          if (this.audioData.length > 0) {
            const finalBuffer = Buffer.concat(this.audioData);
            this.resolvePromise({
              audioBuffer: finalBuffer,
              offsets: this.offsets,
              duration: finalBuffer.length / 12000,
              format: "mp3"
            });
          } else {
            this.rejectPromise(new Error(`WebSocket жабылды. Code: ${code}`));
          }
        }
      });
    });
  }
}

async function generateMicrosoftTTS(text, voice="en-US-EmmaMultilingualNeural", rate="+0%", pitch="+0Hz") {
  try {
    const tts = new SocketEdgeTTS(voice, rate, pitch, text);
    const result = await tts.download();
    
    return {
      status: "success",
      audioBase64: result.audioBuffer.toString('base64'),
      format: result.format,
      duration: result.duration,
      offsets: result.offsets
    };
  } catch (error) {
    console.error("[Microsoft TTS] Error:", error.message);
    throw error;
  }
}

module.exports = generateMicrosoftTTS;