import { useState, useRef, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";

interface Props { onClose: () => void }
type SL = { lang: Lang };

const ACCENT = "#2de897";
const PURPLE = "#a855f7";
const AMBER  = "#f59e0b";
const GREEN  = "#10d88a";
const PINK   = "#f472b6";
const BLUE   = "#3b82f6";
const RED    = "#ff6b7a";
const BG     = "#07090f";
const GLASS  = "rgba(255,255,255,0.055)";
const GLASS2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.10)";
const BORDER2= "rgba(255,255,255,0.16)";

const L = (lang: Lang, en: string, ua: string) => lang === "ua" ? ua : en;

const card = (accent = ACCENT): React.CSSProperties => ({
  background: GLASS2, border: `1px solid ${BORDER2}`, borderRadius: 16,
  padding: "16px 18px", backdropFilter: "blur(12px)",
  boxShadow: `0 0 18px ${accent}18`, marginBottom: 12,
});

function Shell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:"absolute", inset:0, overflowY:"auto", overflowX:"hidden",
      padding:"26px 20px 36px", display:"flex", flexDirection:"column", ...style }}>
      {children}
    </div>
  );
}

function STitle({ icon, text, color = ACCENT }: { icon: string; text: string; color?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:`${color}20`,
        border:`1.5px solid ${color}55`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:20 }}>{icon}</div>
      <div style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:-0.3 }}>{text}</div>
    </div>
  );
}

function Step({ n, color, title, desc }: { n: number; color: string; title: string; desc: string }) {
  return (
    <div style={{ display:"flex", gap:13, alignItems:"flex-start", marginBottom:14 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}22`,
        border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:13, fontWeight:800, color, flexShrink:0, minWidth:32 }}>{n}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:3 }}>{title}</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.58)", lineHeight:1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

function Row({ icon, label, color, desc }: { icon: string; label: string; color: string; desc: string }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:9,
      background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"10px 13px" }}>
      <div style={{ width:34, height:34, borderRadius:9, background:`${color}20`,
        border:`1.5px solid ${color}44`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:16, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color, marginBottom:1 }}>{label}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", lineHeight:1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════
function Slide1({ lang }: SL) {
  const chapters = lang === "ua"
    ? [["🛒","Пошук акаунтів"],["🌐","Проксі та інфра"],["🔀","Одиночний vs Bulk"],["🔬","Техдеталі"],["🛡️","Антибан"]]
    : [["🛒","Sourcing"],["🌐","Proxies & Infra"],["🔀","Single vs Bulk"],["🔬","Tech Deep Dive"],["🛡️","Anti-Ban"]];
  return (
    <Shell style={{ alignItems:"center", justifyContent:"center", textAlign:"center" }}>
      <div style={{ width:88, height:88, borderRadius:26,
        background:`linear-gradient(135deg,${ACCENT}33,${PURPLE}33)`,
        border:`2px solid ${ACCENT}55`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:44, marginBottom:24,
        boxShadow:`0 0 40px ${ACCENT}33` }}>🔐</div>
      <div style={{ fontSize:28, fontWeight:900, color:"#fff", letterSpacing:-0.8, lineHeight:1.1, marginBottom:8 }}>
        {L(lang,"Account & Proxy","Акаунти та проксі")}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:ACCENT, marginBottom:4 }}>
        {L(lang,"Deployment Pipeline","Конвеєр розгортання")}
      </div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:28 }}>
        {L(lang,"From purchase to first send — complete guide","Від покупки до першої розсилки — повний гід")}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
        {chapters.map(([ic,lb]) => (
          <div key={lb} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11,
            padding:"8px 12px", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
            display:"flex", alignItems:"center", gap:5 }}><span>{ic}</span><span>{lb}</span></div>
        ))}
      </div>
      <div style={{ ...card(AMBER), width:"100%", textAlign:"left" }}>
        <div style={{ fontSize:11, fontWeight:700, color:AMBER, marginBottom:4 }}>
          {L(lang,"⚠️ Before you start","⚠️ Перед початком")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "Accounts must be purchased from a trusted vendor with .session + .json format. Never use accounts registered on the same datacenter IP range.",
            "Акаунти мають бути придбані у надійного продавця у форматі .session + .json. Ніколи не використовуйте акаунти, зареєстровані з одного IP-діапазону дата-центрів."
          )}
        </div>
      </div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:"auto", paddingTop:12 }}>
        {L(lang,"Swipe right →","Гортайте вправо →")}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — Sourcing & Vetting
// ═══════════════════════════════════════════════════════════════
function Slide2({ lang }: SL) {
  const rows = lang === "ua" ? [
    { metric:"Формат",   good:".session + .json (Telethon/Pyrogram)", bad:"tdata або прості номери", gi:GREEN, bi:RED },
    { metric:"Вік",      good:"14–90+ днів (\"Отлежані\")",           bad:"0–3 дні (\"Автореги\")",   gi:GREEN, bi:RED },
    { metric:"Безпека",  good:"2FA-пароль включено в .json",          bad:"Без 2FA пароля",            gi:GREEN, bi:RED },
    { metric:"Реєстрація",good:"Фізична SIM / приватний VoIP",        bad:"Дешевий публічний VoIP",    gi:GREEN, bi:RED },
    { metric:"Проксі",   good:"Реєстр через residential/mobile IP",   bad:"Реєстр через datacenter IP",gi:GREEN, bi:RED },
  ] : [
    { metric:"Format",    good:".session + .json (Telethon/Pyrogram)", bad:"tdata or raw phone numbers", gi:GREEN, bi:RED },
    { metric:"Age",       good:"14–90+ days old (\"Aged\")",            bad:"0–3 days (\"Fresh/Auto-reg\")", gi:GREEN, bi:RED },
    { metric:"Security",  good:"2FA password included in .json",        bad:"No 2FA password",             gi:GREEN, bi:RED },
    { metric:"Origin",    good:"Physical SIM / private VoIP",           bad:"Cheap recycled public VoIP",  gi:GREEN, bi:RED },
    { metric:"Proxy reg", good:"Registered via residential/mobile IP",  bad:"Registered via datacenter IP",gi:GREEN, bi:RED },
  ];
  return (
    <Shell>
      <STitle icon="🛒" text={L(lang,"Sourcing & Vetting","Пошук та перевірка")} color={GREEN} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.48)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Use this quality matrix when selecting stock from DarkStore, AccsMarket, or private dealer panels.",
          "Використовуйте цю матрицю при виборі акаунтів на DarkStore, AccsMarket або у приватних постачальників."
        )}
      </div>
      {rows.map(r => (
        <div key={r.metric} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12,
          padding:"10px 13px", marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.5)",
            textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>{r.metric}</div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:`${GREEN}12`, border:`1px solid ${GREEN}30`,
              borderRadius:8, padding:"7px 10px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:GREEN, marginBottom:3 }}>
                {L(lang,"✅ BUY","✅ КУПУЙ")}
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.4 }}>{r.good}</div>
            </div>
            <div style={{ flex:1, background:`${RED}12`, border:`1px solid ${RED}30`,
              borderRadius:8, padding:"7px 10px" }}>
              <div style={{ fontSize:9, fontWeight:700, color:RED, marginBottom:3 }}>
                {L(lang,"❌ AVOID","❌ УНИКАЙ")}
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.4 }}>{r.bad}</div>
            </div>
          </div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — Proxy Infrastructure
// ═══════════════════════════════════════════════════════════════
function Slide3({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🌐" text={L(lang,"Proxy Infrastructure","Інфраструктура проксі")} color={BLUE} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.48)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Each account must connect to Telegram through its own dedicated SOCKS5 proxy — never share one proxy between two accounts.",
          "Кожен акаунт повинен підключатися до Telegram через власний виділений SOCKS5 проксі — ніколи не ділиться одним проксі між двома акаунтами."
        )}
      </div>

      {/* Traffic flow diagram */}
      <div style={{ ...card(BLUE), marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:10 }}>
          {L(lang,"Traffic flow","Схема трафіку")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.72)", lineHeight:1.9,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px",
          fontFamily:"monospace", whiteSpace:"pre" }}>
          {L(lang,
`[ Replit Server ]
  │
  ├─► Acct #1 ─► SOCKS5 Proxy A ─► TG DC1
  ├─► Acct #2 ─► SOCKS5 Proxy B ─► TG DC2
  └─► Acct #3 ─► SOCKS5 Proxy C ─► TG DC4`,
`[ Сервер Replit ]
  │
  ├─► Акаунт #1 ─► SOCKS5 Проксі A ─► TG DC1
  ├─► Акаунт #2 ─► SOCKS5 Проксі B ─► TG DC2
  └─► Акаунт #3 ─► SOCKS5 Проксі C ─► TG DC4`
          )}
        </code>
      </div>

      <Row icon="🏢" label={L(lang,"Recommended providers","Рекомендовані провайдери")} color={ACCENT}
        desc="Smartproxy · Proxy-Seller · IPRoyal" />
      <Row icon="🌍" label={L(lang,"Match country to account","Збіг країни з акаунтом")} color={GREEN}
        desc={L(lang,"+380 accounts → UA proxy · +7 → RU proxy · +1 → US proxy","+380 акаунти → UA проксі · +7 → RU проксі · +1 → US проксі")} />
      <Row icon="🔑" label={L(lang,"Format required","Обов'язковий формат")} color={PURPLE}
        desc="socks5://username:password@ip:port" />

      <div style={{ ...card(AMBER) }}>
        <div style={{ fontSize:11, fontWeight:700, color:AMBER, marginBottom:5 }}>
          {L(lang,"⚠️ Proxy type matters","⚠️ Тип проксі важливий")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "Use Static Residential (ISP) or Sticky Mobile SOCKS5. Datacenter IPs get detected immediately. Avoid \"rotating\" proxies — each account needs a stable IP.",
            "Використовуйте Static Residential (ISP) або Sticky Mobile SOCKS5. Datacenter IP одразу детектуються. Уникайте \"rotating\" проксі — кожному акаунту потрібен стабільний IP."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — Single vs Bulk (toggled)
// ═══════════════════════════════════════════════════════════════
function Slide4({ lang }: SL) {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  const singleSteps = lang === "ua" ? [
    { title:"Відкрийте панель акаунтів", desc:"Натисніть вкладку «Акаунти» у нижній панелі навігації." },
    { title:"Натисніть «Додати»", desc:"Кнопка у правому верхньому куті — відкриє форму додавання." },
    { title:"Введіть номер телефону", desc:"Формат: +380XXXXXXXXX. Номер прив'язаний до купленого акаунта." },
    { title:"Вставте рядок SOCKS5 проксі", desc:"socks5://user:pass@ip:port — один рядок у поле «Проксі»." },
    { title:"Введіть api_id та api_hash", desc:"Отримайте на my.telegram.org → App configuration (ваші особисті ключі)." },
    { title:"Запит коду підтвердження", desc:"Натисніть «Надіслати код». Бекенд маршрутизує через проксі до Telegram." },
    { title:"Введіть код + 2FA пароль", desc:"Код надходить у Telegram-клієнт акаунта або SMS. Потім 2FA якщо є." },
  ] : [
    { title:"Open the Accounts panel", desc:"Tap the «Accounts» tab in the bottom navigation bar." },
    { title:"Tap «Add Account»", desc:"The button in the top-right corner — opens the add form." },
    { title:"Enter the phone number", desc:"Format: +380XXXXXXXXX. The number tied to the purchased account." },
    { title:"Paste the SOCKS5 proxy string", desc:"socks5://user:pass@ip:port — one line in the «Proxy» field." },
    { title:"Enter api_id and api_hash", desc:"Get them from my.telegram.org → App configuration (your personal keys)." },
    { title:"Request confirmation code", desc:"Tap «Send Code». The backend routes the handshake through the proxy." },
    { title:"Enter code + 2FA password", desc:"Code arrives in the account's Telegram client or SMS. Then 2FA if set." },
  ];

  const bulkSteps = lang === "ua" ? [
    { title:"Підготуйте ZIP-архів", desc:"Переконайтесь: кожна пара account.session + account.json присутня. .json повинен містити поле phone та two_factor_auth (якщо є 2FA)." },
    { title:"Підготуйте список проксі", desc:"Один рядок = один SOCKS5 проксі. Формат: socks5://user:pass@ip:port. Кількість може бути менша за кількість акаунтів — ротація автоматична." },
    { title:"Відкрийте «Bulk Import»", desc:"Натисніть кнопку «📦 Bulk» у верхньому правому куті панелі Акаунти." },
    { title:"Завантажте ZIP та проксі", desc:"Перетягніть .zip у зону завантаження. Вставте список проксі у текстове поле нижче." },
    { title:"Натисніть «Виконати імпорт»", desc:"Python-бекенд розпакує архів, зчитає .json, прив'яже проксі, збереже .session-файли та запише акаунти у базу даних." },
    { title:"Перевірте результати", desc:"Панель покаже: знайдено сесій / збережено / пропущено / помилки. Імпортовані акаунти одразу з'являться у списку." },
    { title:"Авторизація не потрібна", desc:"Bulk-імпорт передбачає вже авторизовані сесії. Якщо сесія протухла — статус зміниться на session_invalid після першого підключення воркера." },
  ] : [
    { title:"Prepare the ZIP archive", desc:"Ensure every account.session + account.json pair is present. The .json must contain phone and two_factor_auth (if 2FA is set)." },
    { title:"Prepare your proxy list", desc:"One line = one SOCKS5 proxy. Format: socks5://user:pass@ip:port. Fewer proxies than accounts is OK — rotation is automatic." },
    { title:"Open «Bulk Import»", desc:"Tap the «📦 Bulk» button in the top-right corner of the Accounts panel." },
    { title:"Upload ZIP + paste proxies", desc:"Drag your .zip into the upload zone. Paste the proxy list into the text field below it." },
    { title:"Tap «Execute Import»", desc:"The Python backend unzips the archive, reads .json files, assigns proxies, saves .session files to disk, and writes accounts to the database." },
    { title:"Check results", desc:"The panel shows: sessions found / saved / skipped / errors. Imported accounts appear in the list immediately." },
    { title:"No authorization needed", desc:"Bulk import assumes already-authorized sessions. If a session has expired, the worker will mark it session_invalid on first connection." },
  ];

  const steps = mode === "single" ? singleSteps : bulkSteps;
  const modeColor = mode === "single" ? ACCENT : PURPLE;

  return (
    <Shell>
      <STitle icon="🔀" text={L(lang,"Integration Guide","Керівництво з інтеграції")} color={modeColor} />

      {/* Toggle */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderRadius:14,
        background:GLASS, border:`1px solid ${BORDER}`, overflow:"hidden", flexShrink:0 }}>
        {(["single","bulk"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex:1, padding:"11px 8px", border:"none", cursor:"pointer",
            background: mode === m
              ? `linear-gradient(135deg,${m==="single"?ACCENT:PURPLE}33,${m==="single"?ACCENT:PURPLE}18)`
              : "transparent",
            color: mode === m ? (m==="single"?ACCENT:PURPLE) : "rgba(255,255,255,0.38)",
            fontWeight: mode === m ? 800 : 500,
            fontSize:12, letterSpacing:"-0.01em",
            borderRight: m==="single" ? `1px solid ${BORDER}` : "none",
            transition:"all 0.22s",
          }}>
            {m === "single"
              ? `👤 ${L(lang,"Single Account","Один акаунт")}`
              : `📦 ${L(lang,"Bulk Import","Bulk-імпорт")}`}
          </button>
        ))}
      </div>

      {/* Case label */}
      <div style={{ fontSize:11, fontWeight:700, color:modeColor,
        textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
        {mode === "single"
          ? `${L(lang,"Case A","Варіант А")} — ${L(lang,"Manual UI flow","Ручне додавання через UI")}`
          : `${L(lang,"Case B","Варіант Б")} — ${L(lang,"Automated batch pipeline","Автоматичний пакетний конвеєр")}`}
      </div>

      {/* Diagram */}
      {mode === "single" ? (
        <div style={{ ...card(ACCENT), marginBottom:12, padding:"12px 14px" }}>
          <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.8,
            fontFamily:"monospace", whiteSpace:"pre" }}>
            {L(lang,
`[ Mini App UI ]
  │  phone + proxy + api_id
  ▼
[ API Server ]
  │  routes via SOCKS5
  ▼
[ Telegram DC ] ──► send code
  │  code + 2FA
  ▼
[ Session saved to DB ]`,
`[ Mini App UI ]
  │  телефон + проксі + api_id
  ▼
[ API Server ]
  │  маршрутизує через SOCKS5
  ▼
[ Telegram DC ] ──► надсилає код
  │  код + 2FA
  ▼
[ Сесія збережена в БД ]`
            )}
          </code>
        </div>
      ) : (
        <div style={{ ...card(PURPLE), marginBottom:12, padding:"12px 14px" }}>
          <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.8,
            fontFamily:"monospace", whiteSpace:"pre" }}>
            {L(lang,
`[ Your PC ]              [ Replit Backend ]
  └─► ZIP file ─────────► unzip + parse .json
        ├─ acc1.session ──► sessions/acc1.session
        ├─ acc1.json ─────► phone + 2FA extracted
        ├─ acc2.session ──► proxy assigned
        └─ acc2.json ─────► upsert to DB`,
`[ Ваш ПК ]               [ Replit Бекенд ]
  └─► ZIP файл ───────────► розпаковка + .json
        ├─ acc1.session ──► sessions/acc1.session
        ├─ acc1.json ─────► телефон + 2FA
        ├─ acc2.session ──► проксі призначено
        └─ acc2.json ─────► запис у БД`
            )}
          </code>
        </div>
      )}

      {/* Steps */}
      {steps.map((s, i) => (
        <Step key={i} n={i+1} color={modeColor} title={s.title} desc={s.desc} />
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — Technical Deep Dive
// ═══════════════════════════════════════════════════════════════
function Slide5({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔬" text={L(lang,"Technical Deep Dive","Технічні деталі")} color={BLUE} />

      <div style={card(PINK)}>
        <div style={{ fontSize:13, fontWeight:800, color:PINK, marginBottom:8 }}>
          {L(lang,"Anatomy of a .session File","Анатомія файлу .session")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "A .session file is a local SQLite database created by Telethon on first login. It stores three critical values:",
            "Файл .session — це локальна SQLite база, яку Telethon створює при першому вході. Вона зберігає три критичних значення:"
          )}
        </div>
        {[
          ["Auth Key", L(lang,"256-byte secret negotiated via Diffie-Hellman. Signs every MTProto message.","256-байтний секрет, узгоджений через DH. Підписує кожне MTProto-повідомлення.")],
          ["DC ID", L(lang,"The Telegram Data Center (1–5) where the account data lives.","Дата-центр Telegram (1–5), де зберігаються дані акаунта.")],
          ["Server Addr", L(lang,"The exact TCP endpoint the worker connects to.","Точний TCP-ендпоінт, з яким підключається воркер.")],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display:"flex", gap:8, alignItems:"flex-start", marginTop:9 }}>
            <code style={{ fontSize:10, fontWeight:700, color:PINK, minWidth:84,
              fontFamily:"monospace", paddingTop:1, flexShrink:0 }}>{k as string}</code>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.45 }}>{v as string}</div>
          </div>
        ))}
      </div>

      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:800, color:PURPLE, marginBottom:8 }}>
          {L(lang,"MTProto Handshake via SOCKS5","MTProto Рукостискання через SOCKS5")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.9,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px",
          fontFamily:"monospace", whiteSpace:"pre", marginBottom:10 }}>
          {L(lang,
`[Worker] ──SOCKS5 Auth──► [Proxy]
   └──Obfuscated MTProto──► [Telegram DC]`,
`[Воркер] ──SOCKS5 Auth──► [Проксі]
   └──Obfuscated MTProto──► [Telegram DC]`
          )}
        </code>
        {[
          [L(lang,"① Proxy Auth","① Авторизація проксі"),
           L(lang,"Worker opens an encrypted TCP tunnel to the SOCKS5 proxy using user:pass credentials.",
                  "Воркер відкриває TCP-тунель до SOCKS5 через user:pass.")],
          [L(lang,"② IP Masking","② Маскування IP"),
           L(lang,"Proxy server hides the Replit datacenter origin and routes via its residential IP.",
                  "Проксі-сервер приховує дата-центр Replit та маршрутизує через свій residential IP.")],
          [L(lang,"③ MTProto Transport","③ MTProto транспорт"),
           L(lang,"Handshake uses Telegram's binary MTProto protocol. >300ms latency → drop. Use fast ISP proxies.",
                  "Рукостискання через бінарний MTProto. Затримка >300мс → обрив. Потрібні швидкі ISP-проксі.")],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ marginBottom:9 }}>
            <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:2 }}>{title as string}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.45 }}>{desc as string}</div>
          </div>
        ))}
      </div>

      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:5 }}>
          {L(lang,"📁 .json File Structure","📁 Структура файлу .json")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:1.7,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 12px",
          fontFamily:"monospace", whiteSpace:"pre" }}>
{`{
  "phone": "+380991234567",
  "two_factor_auth": "mypassword"
}`}
        </code>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:8, lineHeight:1.4 }}>
          {L(lang,
            "Only phone is required. two_factor_auth is optional and stored encrypted in the DB.",
            "Тільки phone обов'язковий. two_factor_auth — опційний, зберігається в БД."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — Anti-Ban & Safe Limits
// ═══════════════════════════════════════════════════════════════
function Slide6({ lang }: SL) {
  const limits = lang === "ua" ? [
    {icon:"⏱️",color:ACCENT, label:"Затримка між повідомленнями", val:"15–60 секунд",
     desc:"Не відправляйте швидше за 15 секунд. Людська поведінка — 30–60 с на групу."},
    {icon:"📊",color:GREEN,  label:"Ліміт повідомлень на день",   val:"50–100 / акаунт",
     desc:"Новий акаунт: починайте з 20/день. Прогрівайте +10/день протягом тижня."},
    {icon:"🔄",color:PURPLE, label:"Keep-alive пінги",            val:"кожні 60 секунд",
     desc:"Бекенд надсилає ping кожні 60 с, щоб SOCKS5-проксі не скидав з'єднання."},
    {icon:"⚡",color:AMBER,  label:"Затримка між сесіями",        val:"10–30 секунд",
     desc:"Воркери не завантажують всі акаунти одночасно. Рандомізована затримка між підключеннями."},
  ] : [
    {icon:"⏱️",color:ACCENT, label:"Delay between messages",      val:"15–60 seconds",
     desc:"Never send faster than 15 seconds. Human-like behavior is 30–60s per group."},
    {icon:"📊",color:GREEN,  label:"Daily message limit",          val:"50–100 / account",
     desc:"New account: start with 20/day. Warm up by +10/day over a week."},
    {icon:"🔄",color:PURPLE, label:"Keep-alive pings",            val:"every 60 seconds",
     desc:"The backend pings every 60s to keep the SOCKS5 proxy from dropping idle connections."},
    {icon:"⚡",color:AMBER,  label:"Session stagger delay",        val:"10–30 seconds",
     desc:"Workers don't connect all accounts at once. Randomized delay between each connection."},
  ];

  return (
    <Shell>
      <STitle icon="🛡️" text={L(lang,"Anti-Ban & Safe Limits","Антибан та безпечні ліміти")} color={RED} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.48)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Telegram's anti-spam system flags patterns, not just volume. Mimic human behavior to stay clean.",
          "Антиспам Telegram реагує на патерни, а не лише на об'єм. Імітуйте людську поведінку."
        )}
      </div>

      {limits.map(l => (
        <div key={l.label} style={{ background:GLASS, border:`1px solid ${l.color}28`,
          borderRadius:13, padding:"12px 14px", marginBottom:9,
          boxShadow:`0 0 10px ${l.color}0e` }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>{l.icon}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{l.label}</span>
            </div>
            <span style={{ fontSize:11, fontWeight:800, color:l.color,
              background:`${l.color}18`, border:`1px solid ${l.color}33`,
              borderRadius:8, padding:"2px 9px" }}>{l.val}</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.45 }}>{l.desc}</div>
        </div>
      ))}

      <div style={{ ...card(RED), marginTop:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:RED, marginBottom:6 }}>
          {L(lang,"🚨 FloodWait handling","🚨 Обробка FloodWait")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "When Telegram responds with FloodWaitError, the worker pauses exactly as many seconds as instructed — then resumes automatically. Repeated floods mean your limits are too aggressive.",
            "При FloodWaitError воркер чекає рівно стільки секунд, скільки вказав Telegram — потім продовжує. Повторні флуди = ваші ліміти задіяні надто агресивно."
          )}
        </div>
      </div>

      <div style={{ ...card(GREEN), marginTop:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:GREEN, marginBottom:6 }}>
          {L(lang,"✅ Session warm-up checklist","✅ Чеклист прогріву акаунта")}
        </div>
        {(lang === "ua" ? [
          "☐ День 1–3: тільки читання груп, без відправок",
          "☐ День 4–7: 5–10 повідомлень/день з затримкою 60+ с",
          "☐ Тиждень 2: до 30 повідомлень/день, затримка 30+ с",
          "☐ Тиждень 3+: повний режим 50–100/день",
        ] : [
          "☐ Day 1–3: read groups only, no sends",
          "☐ Day 4–7: 5–10 messages/day, 60s+ delay",
          "☐ Week 2: up to 30 messages/day, 30s+ delay",
          "☐ Week 3+: full mode 50–100/day",
        ]).map((item, i) => (
          <div key={i} style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginBottom:4 }}>{item}</div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — Quality Matrix (account vetting table)
// ═══════════════════════════════════════════════════════════════
function Slide7({ lang }: SL) {
  const rows = [
    { metric: L(lang,"Format","Формат"),       good: ".session + .json (Telethon/Pyrogram)", bad: "tdata / phone list" },
    { metric: L(lang,"Age","Вік"),             good: L(lang,"14–90+ days (\"Aged\")","14–90+ днів (\"Відлежані\")"), bad: L(lang,"0–3 days (\"Fresh\")","0–3 дні (\"Автореги\")") },
    { metric: L(lang,"Security","Безпека"),    good: L(lang,"2FA password included","2FA пароль в комплекті"), bad: L(lang,"No 2FA","2FA відсутній") },
    { metric: L(lang,"Origin","Походження"),   good: L(lang,"Physical SIM / residential virtual","Фізична SIM / чистий virtual"), bad: L(lang,"Cheap VoIP / datacenter IPs","VoIP / IP дата-центру") },
  ];
  return (
    <Shell>
      <STitle icon="📊" text={L(lang,"Quality Matrix","Матриця якості акаунтів")} color={GREEN} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Buying the wrong accounts is the #1 reason networks collapse. Use this matrix before every purchase.",
          "Неправильні акаунти — причина #1 краху мереж. Використовуйте цю матрицю перед кожною покупкою."
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {rows.map(r => (
          <div key={r.metric} style={{ background:GLASS2, border:`1px solid ${BORDER2}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ background:"rgba(255,255,255,0.04)", padding:"7px 14px", fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em", textTransform:"uppercase" }}>{r.metric}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", padding:"10px 14px", gap:8 }}>
              <div style={{ background:"rgba(45,232,151,0.08)", border:"1px solid rgba(45,232,151,0.22)", borderRadius:9, padding:"8px 10px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:GREEN, marginBottom:3 }}>✓ {L(lang,"BUY","КУПУВАТИ")}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.75)", lineHeight:1.4 }}>{r.good}</div>
              </div>
              <div style={{ background:"rgba(255,107,122,0.08)", border:"1px solid rgba(255,107,122,0.22)", borderRadius:9, padding:"8px 10px" }}>
                <div style={{ fontSize:9, fontWeight:700, color:RED, marginBottom:3 }}>✗ {L(lang,"AVOID","УНИКАТИ")}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.75)", lineHeight:1.4 }}>{r.bad}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:12, background:"rgba(245,158,11,0.09)", border:"1px solid rgba(245,158,11,0.28)", borderRadius:13, padding:"12px 14px" }}>
        <div style={{ fontSize:11, fontWeight:800, color:AMBER, marginBottom:5 }}>⚠️ {L(lang,"Critical Warning","Критичне попередження")}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Never buy accounts created from the same datacenter IP range. Always ask vendors if accounts were created using residential or mobile proxies. Datacenter-registered accounts get flagged immediately.",
            "Ніколи не купуйте акаунти з одного IP-діапазону дата-центру. Уточнюйте у продавця: residential чи мобільні проксі? Акаунти з датацентрів одразу отримують прапор."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — Proxy Procurement Guide
// ═══════════════════════════════════════════════════════════════
function Slide8({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🛒" text={L(lang,"Proxy Procurement","Купівля проксі")} color={BLUE} />

      <div style={card(BLUE)}>
        <div style={{ fontSize:12, fontWeight:800, color:BLUE, marginBottom:8 }}>
          {L(lang,"Recommended Providers","Рекомендовані провайдери")}
        </div>
        {[
          ["Smartproxy",    L(lang,"Large pool, ISP + residential","Великий пул, ISP + residential")],
          ["Proxy-Seller",  L(lang,"Static ISP, stable long-term","Статичні ISP, стабільні")],
          ["IPRoyal",       L(lang,"Mobile sticky SOCKS5, affordable","Мобільні sticky SOCKS5, доступно")],
        ].map(([name, desc]) => (
          <div key={name as string} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:9 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:BLUE, marginTop:4, flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{name as string}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{desc as string}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:800, color:GREEN, marginBottom:8 }}>
          {L(lang,"Correct Format","Правильний формат")}
        </div>
        <code style={{ display:"block", fontSize:11, color:GREEN, background:"rgba(16,216,138,0.08)", border:`1px solid ${GREEN}30`, borderRadius:8, padding:"10px 12px", fontFamily:"monospace", marginBottom:8 }}>
          socks5://username:password@ip:port
        </code>
        <code style={{ display:"block", fontSize:11, color:"rgba(255,255,255,0.5)", background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", fontFamily:"monospace" }}>
          socks5://user:pass@185.23.41.12:9000
        </code>
      </div>

      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, fontWeight:800, color:PURPLE, marginBottom:6 }}>
          {L(lang,"Type Selection","Вибір типу проксі")}
        </div>
        {[
          [L(lang,"Static Residential (ISP)","Статичний Residential (ISP)"),
           L(lang,"Best for aged accounts. Same IP for weeks. Expensive but reliable.","Кращі для відлежаних акаунтів. Один IP тижнями. Дорогі, але надійні.")],
          [L(lang,"Sticky Mobile SOCKS5","Мобільний Sticky SOCKS5"),
           L(lang,"Best for fresh accounts. Rotates like a real phone. More budget-friendly.","Кращі для свіжих акаунтів. Ротуються як реальний телефон. Бюджетніші.")],
        ].map(([type, desc]) => (
          <div key={type as string} style={{ marginBottom:9 }}>
            <div style={{ fontSize:11, fontWeight:700, color:PURPLE, marginBottom:2 }}>{type as string}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{desc as string}</div>
          </div>
        ))}
        <div style={{ fontSize:11, fontWeight:700, color:AMBER, marginTop:4 }}>
          ⚠️ {L(lang,"Always match proxy country to account phone prefix (+7 → RU, +1 → US)","Завжди збігайте країну проксі з префіксом акаунта (+7 → RU, +1 → US)")}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — Scaling Beyond 100 Accounts
// ═══════════════════════════════════════════════════════════════
function Slide9({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🚀" text={L(lang,"Scaling to 100+ Accounts","Масштаб 100+ акаунтів")} color={PINK} />

      <div style={card(PINK)}>
        <div style={{ fontSize:12, fontWeight:800, color:PINK, marginBottom:8 }}>
          {L(lang,"Connection Pool Strategy","Стратегія пулу підключень")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:2,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", fontFamily:"monospace", marginBottom:8 }}>
          {L(lang,
`[Replit Server]
  ├── Account #1 ──► [SOCKS5 US] ──► [DC1]
  ├── Account #2 ──► [SOCKS5 UK] ──► [DC2]
  └── Account #N ──► [SOCKS5 DE] ──► [DC4]`,
`[Сервер Replit]
  ├── Акаунт #1 ──► [SOCKS5 US] ──► [DC1]
  ├── Акаунт #2 ──► [SOCKS5 UK] ──► [DC2]
  └── Акаунт #N ──► [SOCKS5 DE] ──► [DC4]`
          )}
        </code>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.5 }}>
          {L(lang,
            "One unique proxy per account is ideal. At scale, rotate proxies across accounts using the platform's proxy rotation engine (proxy_index in DB).",
            "Один унікальний проксі на акаунт — ідеально. При масштабуванні — ротація проксі між акаунтами через рушій ротації (proxy_index в БД)."
          )}
        </div>
      </div>

      <div style={card(AMBER)}>
        <div style={{ fontSize:12, fontWeight:800, color:AMBER, marginBottom:8 }}>
          {L(lang,"Daily Quota Rotation","Добова ротація квот")}
        </div>
        {(lang === "ua" ? [
          "Платформа скидає sent_today о 00:00 UTC щодня",
          "Акаунти з near_limit (≥90% ліміту) позначаються — Campaign Engine їх пропускає",
          "Функція 'Сброс' в Accounts вручну скидає лічильники",
          "Щоденний підсумок надсилається в Telegram о 9:00 UTC",
        ] : [
          "Platform resets sent_today at 00:00 UTC daily",
          "Accounts at near_limit (≥90% of quota) are flagged — Campaign Engine skips them",
          "'Reset' button in Accounts manually resets counters",
          "Daily digest fires to Telegram at 09:00 UTC",
        ]).map((item, i) => (
          <div key={i} style={{ display:"flex", gap:9, alignItems:"flex-start", marginBottom:7 }}>
            <span style={{ fontSize:12, color:AMBER, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.4 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={card(GREEN)}>
        <div style={{ fontSize:11, fontWeight:800, color:GREEN, marginBottom:6 }}>
          {L(lang,"🌐 Bulk Proxy Update","🌐 Масова зміна проксі")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "In the Accounts tab, tap the 🌐 Proxy button in the toolbar to apply one proxy string to all accounts, only accounts without a proxy, or only proxy_failed accounts — in one tap.",
            "У вкладці Акаунти натисніть 🌐 Проксі в панелі інструментів, щоб застосувати один рядок проксі до всіх акаунтів, тільки без проксі, або тільки до proxy_failed — одним дотиком."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — AI-Automated Profile Setup
// ═══════════════════════════════════════════════════════════════
function Slide10({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🤖" text={L(lang,"AI Profile Setup (Step 7)","AI-профіль акаунта (Крок 7)")} color={PURPLE} />

      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, fontWeight:800, color:PURPLE, marginBottom:8 }}>
          {L(lang,"How it works","Як це працює")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.6, marginBottom:10 }}>
          {L(lang,
            "After 2FA is confirmed (Step 6), the Account Factory runs Profile Setup automatically. In AI mode, Gemini generates a realistic Russian-audience persona — first name, last name, and a natural bio — then sets it on the Telegram account via MTProto.",
            "Після підтвердження 2FA (Крок 6), Фабрика акаунтів автоматично виконує налаштування профілю. В режимі AI — Gemini генерує реалістичну персону для російської аудиторії: ім'я, прізвище та органічне біо — і застосовує їх до акаунта через MTProto."
          )}
        </div>
        {[
          [L(lang,"🎲 Name & Bio","🎲 Ім'я та біо"),
           L(lang,"Gemini 2.5 Flash generates a believable Russian first/last name + 1–2 sentence bio describing a real-world interest (fuel, auto, travel, etc.).",
              "Gemini 2.5 Flash генерує переконливе ім'я та 1–2-речення біо з реальними інтересами (паливо, авто, мандрівки тощо).")],
          [L(lang,"🖼️ Avatar Pool","🖼️ Пул аватарів"),
           L(lang,"Drop portrait images (.jpg/.png) into assets/pending_avatars/. The pipeline randomly picks one, sets it as the profile photo, then moves it to assets/used_avatars/ to prevent reuse.",
              "Помістіть портрети (.jpg/.png) у assets/pending_avatars/. Конвеєр випадково вибирає один, встановлює аватар і переміщує файл до assets/used_avatars/, щоб уникнути повторного використання.")],
          [L(lang,"✅ Fallback","✅ Резерв"),
           L(lang,"If the avatar pool is empty or Gemini is unavailable, the account is registered without a photo. Profile name/bio still apply if AI call succeeds.",
              "Якщо пул порожній або Gemini недоступний — акаунт реєструється без фото. Ім'я/біо від AI застосовуються, якщо виклик Gemini успішний.")],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:PURPLE, marginBottom:3 }}>{title as string}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.4 }}>{desc as string}</div>
          </div>
        ))}
      </div>

      <div style={card(ACCENT)}>
        <div style={{ fontSize:11, fontWeight:800, color:ACCENT, marginBottom:6 }}>
          {L(lang,"Avatar Pool Management","Керування пулом аватарів")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.7)", lineHeight:2,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 12px", fontFamily:"monospace" }}>
{`assets/
  pending_avatars/   ← add new portraits here
  used_avatars/      ← consumed photos land here`}
        </code>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:7, lineHeight:1.5 }}>
          {L(lang,
            "Keep at least 1 image per account you plan to register. Refill pending_avatars/ from your photo library whenever the folder empties.",
            "Тримайте мінімум 1 фото на кожен акаунт, який плануєте зареєструвати. Поповнюйте pending_avatars/ з вашої бібліотеки, коли папка спорожніє."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — Manual Profile Setup
// ═══════════════════════════════════════════════════════════════
function Slide11({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="✍️" text={L(lang,"Manual Profile Setup (Step 7)","Ручний профіль акаунта (Крок 7)")} color={GREEN} />

      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:800, color:GREEN, marginBottom:8 }}>
          {L(lang,"When to use Manual mode","Коли обирати ручний режим")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>
          {L(lang,
            "Use Manual mode when you need precise brand control — e.g. creating operator accounts, test accounts, or accounts tied to a specific persona you manage.",
            "Обирайте ручний режим, коли потрібен точний контроль над брендом — наприклад, для операторських акаунтів, тестових або акаунтів із конкретною персоною, яку ви ведете."
          )}
        </div>
      </div>

      <div style={card(AMBER)}>
        <div style={{ fontSize:12, fontWeight:800, color:AMBER, marginBottom:8 }}>
          {L(lang,"Fields & Uploads","Поля та завантаження")}
        </div>
        {[
          [L(lang,"First Name *","Ім'я *"),        L(lang,"Required. Applied to the Telegram account name.","Обов'язкове. Встановлюється як ім'я в Telegram.")],
          [L(lang,"Last Name","Прізвище"),         L(lang,"Optional. Fills the last name field on the profile.","Необов'язкове. Заповнює поле прізвища профілю.")],
          [L(lang,"Bio","Біо"),                    L(lang,"Up to 70 chars. Appears under the username in profile view.","До 70 символів. Відображається під ніком у профілі.")],
          [L(lang,"Photos (multi-upload)","Фото (мульти-завантаження)"), L(lang,"Upload 1–5 images. They are base64-encoded and sent to the server. The pipeline sets each photo in order — Telegram shows the first as primary.","Завантажте 1–5 зображень. Кодуються в base64 і відправляються на сервер. Конвеєр встановлює кожне фото по черзі — Telegram показує перше як основне.")],
        ].map(([field, desc]) => (
          <div key={field as string} style={{ marginBottom:9, borderBottom:`1px solid rgba(255,255,255,0.05)`, paddingBottom:9 }}>
            <div style={{ fontSize:11, fontWeight:700, color:AMBER, marginBottom:2 }}>{field as string}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{desc as string}</div>
          </div>
        ))}
      </div>

      <div style={card(PINK)}>
        <div style={{ fontSize:11, fontWeight:800, color:PINK, marginBottom:6 }}>
          {L(lang,"🔄 Selecting the mode","🔄 Вибір режиму")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "In the Account Factory (Accounts → Factory icon), Step 7 shows a toggle: «🤖 AI Auto» / «✍️ Manual». AI Auto is the default. Switch to Manual to reveal the name/bio/photo upload form before launching the factory.",
            "У Фабриці акаунтів (Акаунти → іконка Factory), Крок 7 показує перемикач: «🤖 AI Auto» / «✍️ Вручну». AI Auto — за замовчуванням. Перемкніться на Вручну, щоб відкрити форму імені/біо/фото перед запуском фабрики."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide registry
// ═══════════════════════════════════════════════════════════════
const KEYWORDS_ACCOUNTS: string[] = [
  "overview pipeline accounts proxy intro",
  "sourcing vetting purchase buy stock aged fresh quality",
  "SOCKS5 proxy infrastructure traffic flow DC datacenter",
  "integration guide add single bulk import ZIP upload deploy",
  "technical session file SQLite auth key MTProto handshake",
  "anti-ban safe limits flood wait warmup delay stagger",
  "quality matrix buy avoid datacenter residential SIM",
  "procurement provider Smartproxy IPRoyal format socks5",
  "scaling 100 accounts pool rotation quota daily reset",
  "AI profile gemini avatar persona name bio automated step 7",
  "manual profile name bio photo upload branding operator persona",
  "warmup scheduler organic messages groups aging ban risk step 8",
];
// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — Account Warmup Scheduler
// ═══════════════════════════════════════════════════════════════
function Slide12({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔥" text={L(lang,"Account Warmup Scheduler","Планувальник прогріву акаунтів")} color={AMBER} />

      <div style={card(AMBER)}>
        <div style={{ fontSize:12, fontWeight:800, color:AMBER, marginBottom:8 }}>
          {L(lang,"What is warmup?","Що таке прогрів?")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>
          {L(lang,
            "Freshly registered Telegram accounts look suspicious to anti-spam systems. The warmup scheduler automatically sends organic messages (about cars, fuel, daily topics) to public Russian groups over 48 hours, aging the account and reducing ban risk before your first campaign.",
            "Свіжозареєстровані акаунти виглядають підозріло для антиспам-систем Telegram. Планувальник прогріву автоматично надсилає органічні повідомлення (про авто, паливо, побут) до публічних російських груп протягом 48 годин — старіє акаунт і знижує ризик бану перед першою кампанією."
          )}
        </div>
      </div>

      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:800, color:GREEN, marginBottom:8 }}>
          {L(lang,"How it runs","Як це працює")}
        </div>
        {[
          [L(lang,"🚀 Auto-start","🚀 Авто-старт"),
           L(lang,"Warmup is queued automatically after Step 8 (Persist) in the Account Factory. No manual action needed.","Прогрів ставиться в чергу автоматично після Кроку 8 (Збереження) у Фабриці акаунтів. Жодних ручних дій не потрібно.")],
          [L(lang,"⏱ Paced delays","⏱ Паузи між повідомленнями"),
           L(lang,"4–10 minute random delays between each message simulate natural human pacing. Burst-free and flood-safe.","4–10-хвилинні випадкові паузи між кожним повідомленням імітують природну поведінку людини. Без сплесків і флуду.")],
          [L(lang,"💬 35 message templates","💬 35 шаблонів повідомлень"),
           L(lang,"Russian organic messages about cars, fuel prices, road life, and daily topics. Randomly selected per message.","Органічні повідомлення про авто, ціни на паливо, дорогу та побут. Вибираються випадково.")],
          [L(lang,"🔄 10 public groups","🔄 10 публічних груп"),
           L(lang,"Groups are shuffled per run. If a group rejects the message (write-forbidden), it is skipped automatically.","Групи перемішуються для кожного запуску. Якщо група відхиляє (write-forbidden) — пропускається автоматично.")],
        ].map(([title, desc]) => (
          <div key={title as string} style={{ marginBottom:10, borderBottom:`1px solid rgba(255,255,255,0.04)`, paddingBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:GREEN, marginBottom:3 }}>{title as string}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{desc as string}</div>
          </div>
        ))}
      </div>

      <div style={card(PURPLE)}>
        <div style={{ fontSize:11, fontWeight:800, color:PURPLE, marginBottom:6 }}>
          {L(lang,"📊 Status badges in Accounts tab","📊 Статусні значки у вкладці Акаунти")}
        </div>
        {[
          ["⏳ ПРОГРІВ",  L(lang,"Queued — warmup task is waiting to start","У черзі — завдання прогріву очікує запуску")],
          ["🔥 ПРОГРІВ N/10", L(lang,"Running — N messages sent so far","Виконується — N повідомлень надіслано")],
          ["✅ ПРОГРІТИЙ", L(lang,"Done — account is aged and ready for campaigns","Готово — акаунт прогрітий і готовий до кампаній")],
          ["✗ ПОМИЛКА",    L(lang,"Failed — check session/proxy; click 🔥 Start Warmup to retry","Помилка — перевірте сесію/проксі; натисніть 🔥 Старт прогріву для повтору")],
        ].map(([badge, desc]) => (
          <div key={badge as string} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
            <code style={{ fontSize:9, fontWeight:800, color:PURPLE, background:`${PURPLE}15`, border:`1px solid ${PURPLE}30`, borderRadius:6, padding:"2px 6px", flexShrink:0, whiteSpace:"nowrap" }}>{badge as string}</code>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{desc as string}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

const SLIDES: Array<(p: SL) => React.ReactElement> = [
  Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12,
];
const TOTAL = SLIDES.length;

const TITLES: Record<Lang, string[]> = {
  en: [
    "Account & Proxy Pipeline",
    "Sourcing & Vetting",
    "Proxy Infrastructure",
    "Integration Guide",
    "Technical Deep Dive",
    "Anti-Ban & Safe Limits",
    "Quality Matrix",
    "Proxy Procurement",
    "Scaling to 100+",
  ],
  ua: [
    "Конвеєр акаунтів та проксі",
    "Пошук та перевірка",
    "Інфраструктура проксі",
    "Керівництво з інтеграції",
    "Технічні деталі",
    "Антибан та безпечні ліміти",
    "Матриця якості",
    "Купівля проксі",
    "Масштаб 100+",
  ],
};

const SLIDE_COLORS: string[] = [ACCENT, GREEN, BLUE, PURPLE, BLUE, RED, GREEN, BLUE, PINK];

// ═══════════════════════════════════════════════════════════════
// ManualAccountsPage shell
// ═══════════════════════════════════════════════════════════════
export function ManualAccountsPage({ onClose }: Props) {
  const { lang } = useI18n();
  const [current, setCurrent]       = useState(0);
  const [showSearch, setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const touchX   = useRef(0);
  const touchY   = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(TOTAL - 1, c + 1)), []);

  function toggleSearch() {
    if (showSearch) { setShowSearch(false); setSearchQuery(""); }
    else { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 60); }
  }

  function onTouchStart(e: React.TouchEvent) {
    if (showSearch) return;
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (showSearch) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchY.current);
    if (Math.abs(dx) > 48 && dy < 60) { if (dx < 0) next(); else prev(); }
  }

  const SlideComp = SLIDES[current]!;
  const accentColor = SLIDE_COLORS[current] ?? ACCENT;
  const titles = TITLES[lang];

  // Search: filter against title + keyword hints
  const q = searchQuery.toLowerCase().trim();
  const searchResults: Array<{ index: number; title: string }> = q.length < 1 ? [] :
    titles.flatMap((title, i) => {
      const hay = `${title} ${KEYWORDS_ACCOUNTS[i] ?? ""}`.toLowerCase();
      return hay.includes(q) ? [{ index: i, title }] : [];
    });

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:200, background:BG,
        display:"flex", flexDirection:"column", userSelect:"none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{ borderBottom:`1px solid ${BORDER}`, background:"rgba(7,9,15,0.82)",
        backdropFilter:"blur(16px)", flexShrink:0, zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 18px 7px" }}>
          {showSearch ? (
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={L(lang,"Search slides…","Пошук слайдів…")}
              style={{ flex:1, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)",
                borderRadius:10, padding:"7px 12px", fontSize:13, color:"rgba(255,255,255,0.9)",
                outline:"none", marginRight:10 }}
            />
          ) : (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:accentColor, boxShadow:`0 0 8px ${accentColor}`, flexShrink:0 }} />
                <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.88)", letterSpacing:-0.2 }}>{titles[current]}</div>
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:1, paddingLeft:13 }}>
                {L(lang,"Account & Proxy Pipeline","Конвеєр акаунтів та проксі")} · {current + 1} / {TOTAL}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={toggleSearch} style={{ background:showSearch?`${accentColor}22`:GLASS2,
              border:`1px solid ${showSearch?accentColor:BORDER2}`, borderRadius:10, width:33, height:33,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:showSearch?accentColor:"rgba(255,255,255,0.55)", fontSize:15, cursor:"pointer" }}>🔍</button>
            <button onClick={onClose} style={{ background:GLASS2, border:`1px solid ${BORDER2}`,
              borderRadius:10, width:33, height:33, display:"flex", alignItems:"center",
              justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:15, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {/* Search results */}
        {showSearch && searchResults.length > 0 && (
          <div style={{ maxHeight:220, overflowY:"auto", borderTop:`1px solid ${BORDER}` }}>
            {searchResults.map(r => (
              <div key={r.index}
                onClick={() => { setCurrent(r.index); setShowSearch(false); setSearchQuery(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
                  borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:"pointer",
                  background:"rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize:10, color:accentColor, fontWeight:700, minWidth:22,
                  background:`${accentColor}18`, border:`1px solid ${accentColor}30`, borderRadius:6,
                  padding:"2px 5px", textAlign:"center" }}>{r.index + 1}</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)" }}>{r.title}</span>
              </div>
            ))}
          </div>
        )}
        {showSearch && q.length >= 1 && searchResults.length === 0 && (
          <div style={{ padding:"12px 18px", fontSize:12, color:"rgba(255,255,255,0.3)", borderTop:`1px solid ${BORDER}` }}>
            {L(lang,"No slides found","Слайдів не знайдено")}
          </div>
        )}
      </div>

      {/* Slide area */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(170deg,${BG} 0%,#0b1020 40%,${BG} 100%)` }} />
          <div style={{ position:"absolute", top:-160, left:-80, width:380, height:380, borderRadius:"50%",
            background:`radial-gradient(circle,${accentColor}18 0%,transparent 68%)`,
            transition:"background 0.4s" }} />
          <div style={{ position:"absolute", bottom:-80, right:-100, width:300, height:300, borderRadius:"50%",
            background:`radial-gradient(circle,${PURPLE}16 0%,transparent 68%)` }} />
        </div>
        <SlideComp lang={lang} />
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, padding:"9px 18px 16px", borderTop:`1px solid ${BORDER}`,
        background:"rgba(7,9,15,0.88)", backdropFilter:"blur(16px)",
        display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={prev} disabled={current === 0}
          style={{ background:current===0?"rgba(255,255,255,0.04)":GLASS2,
            border:`1px solid ${current===0?"rgba(255,255,255,0.06)":BORDER2}`,
            borderRadius:11, padding:"9px 16px", fontSize:13,
            color:current===0?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.7)",
            cursor:current===0?"default":"pointer", flexShrink:0 }}>
          {L(lang,"← Back","← Назад")}
        </button>

        <div style={{ flex:1, display:"flex", justifyContent:"center", gap:5, flexWrap:"wrap" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: i === current ? 22 : 6, height: 6, borderRadius: 3,
              background: i === current ? accentColor : "rgba(255,255,255,0.16)",
              border:"none", padding:0, cursor:"pointer",
              transition:"all 0.2s", flexShrink:0,
            }} />
          ))}
        </div>

        <button onClick={current === TOTAL - 1 ? onClose : next}
          style={{
            background: current === TOTAL - 1
              ? `linear-gradient(135deg,${GREEN},${ACCENT})`
              : `linear-gradient(135deg,${accentColor},${PURPLE})`,
            border:"none", borderRadius:11, padding:"9px 16px", fontSize:13,
            color:"#fff", fontWeight:700, cursor:"pointer",
            boxShadow:`0 0 14px ${accentColor}3a`, flexShrink:0 }}>
          {current === TOTAL - 1 ? L(lang,"✓ Close","✓ Закрити") : L(lang,"Next →","Далі →")}
        </button>
      </div>
    </div>
  );
}
