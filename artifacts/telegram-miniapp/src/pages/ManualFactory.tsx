import { useState, useRef, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";

interface Props { onClose: () => void }
type SL = { lang: Lang };

const ACCENT = "#f59e0b";
const PURPLE = "#a855f7";
const GREEN  = "#2de897";
const BLUE   = "#3b82f6";
const TEAL   = "#2dd4bf";
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

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ display:"inline-block", background:`${color}20`, border:`1px solid ${color}55`,
      borderRadius:6, padding:"2px 8px", fontSize:11, color, fontWeight:600, marginRight:6, marginBottom:4 }}>
      {text}
    </span>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div style={{ background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.12)",
      borderRadius:10, padding:"10px 14px", fontFamily:"monospace", fontSize:12,
      color:"rgba(45,232,151,0.85)", lineHeight:1.6, wordBreak:"break-all",
      marginTop:8, marginBottom:4 }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════
function Slide1({ lang }: SL) {
  return (
    <Shell style={{ justifyContent:"center", alignItems:"center", textAlign:"center", gap:0 }}>
      <div style={{ fontSize:72, marginBottom:24, filter:`drop-shadow(0 0 32px ${ACCENT}60)` }}>🏭</div>
      <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:-0.5, marginBottom:8 }}>
        {L(lang, "Account Factory", "Фабрика Акаунтів")}
      </div>
      <div style={{ fontSize:14, color:`${ACCENT}`, fontWeight:700, marginBottom:20 }}>
        {L(lang, "Automated Telegram Account Registration", "Автоматична реєстрація акаунтів Telegram")}
      </div>
      <div style={{ maxWidth:300, fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginBottom:32 }}>
        {L(lang,
          "Zero-touch account creation: buy a real SIM number, connect via residential proxy, register in Telegram, set 2FA — all in under 3 minutes.",
          "Реєстрація без участі людини: купуємо реальний SIM-номер, підключаємось через residential проксі, реєструємось в Telegram, встановлюємо 2FA — менш ніж за 3 хвилини."
        )}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
        <Tag text="SMSPool API" color={ACCENT} />
        <Tag text="Decodo SOCKS5" color={BLUE} />
        <Tag text="Telethon" color={GREEN} />
        <Tag text="2FA" color={PURPLE} />
        <Tag text={L(lang, "Batch Mode", "Пакетний режим")} color={TEAL} />
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — What is Account Factory?
// ═══════════════════════════════════════════════════════════════
function Slide2({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🤖" text={L(lang, "What is Account Factory?", "Що таке Фабрика акаунтів?")} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.65)", lineHeight:1.7, marginBottom:18 }}>
        {L(lang,
          "Account Factory is a fully automated pipeline that registers fresh, battle-ready Telegram accounts without any manual input. It orchestrates three external services to create a complete sender account in your CRM.",
          "Фабрика акаунтів — це повністю автоматизований конвеєр для реєстрації свіжих, бойових акаунтів Telegram без жодних ручних дій. Він оркеструє три зовнішніх сервіси для створення повноцінного відправника в CRM."
        )}
      </div>
      <Row icon="📱" label="SMSPool" color={ACCENT}
        desc={L(lang, "Virtual SIM provider — buys a real phone number for receiving the Telegram SMS code. Auto-cancelled on failure.", "Провайдер віртуальних SIM — купує реальний номер телефону для отримання SMS-коду Telegram. Автоматично скасовується при помилці.")} />
      <Row icon="🌐" label="Decodo Proxy" color={BLUE}
        desc={L(lang, "Residential SOCKS5 proxy — tunnels all Telegram traffic to bypass datacenter IP blocks. Each account gets its own residential IP.", "Residential SOCKS5 проксі — тунелює весь трафік Telegram, обходячи блокування datacenter-IP. Кожен акаунт отримує власний residential IP.")} />
      <Row icon="🔑" label="Telethon" color={GREEN}
        desc={L(lang, "Python MTProto client — performs the actual Telegram registration handshake, sets up 2FA, and saves the .session file.", "Python MTProto-клієнт — виконує фактичне рукостискання реєстрації Telegram, встановлює 2FA та зберігає .session файл.")} />
      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>
          {L(lang,
            "✅ Every registered account is immediately secured with 2FA and stored in your CRM with the session file — ready to start broadcasting.",
            "✅ Кожен зареєстрований акаунт одразу захищається 2FA і зберігається у CRM разом із session-файлом — готовий до розсилки."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — Prerequisites
// ═══════════════════════════════════════════════════════════════
function Slide3({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📋" text={L(lang, "What You Need", "Що вам потрібно")} color={BLUE} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:18 }}>
        {L(lang, "Three things are required before you can use Account Factory:", "Три речі необхідні перед використанням Фабрики акаунтів:")}
      </div>
      <Step n={1} color={ACCENT} title="SMSPool API Key"
        desc={L(lang, "A paid account on smspool.net. Top up with cryptocurrency or card. Ukraine/Kazakhstan numbers cost ~0.20–0.50 USD each.", "Платний акаунт на smspool.net. Поповніть криптовалютою або карткою. Номери України/Казахстану коштують ~0.20–0.50 USD кожен.")} />
      <Step n={2} color={BLUE} title={L(lang, "Decodo SOCKS5 Proxy String", "Рядок Decodo SOCKS5 проксі")}
        desc={L(lang, "A residential proxy from smartproxy.com (Decodo brand). Format: socks5://user:pass@ip:port. Mobile or residential — do NOT use datacenter.", "Residential проксі з smartproxy.com (бренд Decodo). Формат: socks5://user:pass@ip:port. Mobile або residential — НЕ використовуйте datacenter.")} />
      <Step n={3} color={GREEN} title={L(lang, "Telegram API Credentials", "Облікові дані Telegram API")}
        desc={L(lang, "API_ID and API_HASH from my.telegram.org — these identify your Telethon app to Telegram. Set once as env vars TELETHON_API_ID and TELETHON_API_HASH.", "API_ID та API_HASH з my.telegram.org — ідентифікують ваш Telethon-додаток для Telegram. Встановіть одноразово як змінні TELETHON_API_ID та TELETHON_API_HASH.")} />
      <div style={card(PURPLE)}>
        <div style={{ fontSize:11, color:"rgba(196,174,255,0.8)", lineHeight:1.6 }}>
          💡 {L(lang,
            "Tip: You can also enter API credentials directly in the form each time — useful if you use multiple app registrations.",
            "Порада: Можна також вводити облікові дані API у форму щоразу — корисно, якщо ви використовуєте кілька реєстрацій додатків."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — SMSPool API Key
// ═══════════════════════════════════════════════════════════════
function Slide4({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📱" text="SMSPool API" color={ACCENT} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "SMSPool is a virtual SIM marketplace. The factory uses Service ID 11 (Telegram) to rent a real number, wait for the code, and auto-cancel if the number is banned or the timeout expires.",
          "SMSPool — маркетплейс віртуальних SIM. Фабрика використовує Service ID 11 (Telegram) для оренди реального номера, очікування коду та автоматичного скасування при бані або закінченні таймауту."
        )}
      </div>
      <Step n={1} color={ACCENT} title={L(lang, "Create account", "Створити акаунт")}
        desc="smspool.net → Register → top up balance (min $1)" />
      <Step n={2} color={ACCENT} title={L(lang, "Copy your API key", "Скопіюйте ваш API ключ")}
        desc={L(lang, "Go to smspool.net/profile → API section → copy the key", "Перейдіть на smspool.net/profile → розділ API → скопіюйте ключ")} />
      <Step n={3} color={ACCENT} title={L(lang, "Choose country wisely", "Оберіть країну мудро")}
        desc={L(lang, "Ukraine (ua), Kazakhstan (kz), Estonia (ee) have the best success rates for Telegram numbers.", "Україна (ua), Казахстан (kz), Естонія (ee) мають найкращі показники успіху для Telegram-номерів.")} />
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>
          {L(lang, "Anti-ban protection", "Захист від витрати коштів")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "If Telegram bans the number instantly (PhoneNumberBannedError), the factory auto-cancels the SMSPool order — you don't pay for the banned number.",
            "Якщо Telegram миттєво банить номер (PhoneNumberBannedError), фабрика автоматично скасовує замовлення в SMSPool — ви не платите за заблокований номер."
          )}
        </div>
      </div>
      <div style={card()}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>{L(lang, "SMSPool API endpoints used:", "Використовувані API-ендпоінти SMSPool:")}</div>
        <Code>POST /purchase/sms  → buy number</Code>
        <Code>GET  /sms/check     → poll for code</Code>
        <Code>POST /sms/cancel    → refund on fail</Code>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — Decodo Proxy
// ═══════════════════════════════════════════════════════════════
function Slide5({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🌐" text={L(lang, "Decodo Residential Proxy", "Decodo Residential Проксі")} color={BLUE} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "Decodo (by Smartproxy) provides residential and mobile SOCKS5 proxies. Each registration must route through a real residential IP — Telegram flags datacenter IPs instantly.",
          "Decodo (від Smartproxy) надає residential та mobile SOCKS5 проксі. Кожна реєстрація має проходити через реальний residential IP — Telegram миттєво виявляє datacenter IP."
        )}
      </div>
      <div style={card(BLUE)}>
        <div style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:8 }}>{L(lang, "Required format", "Необхідний формат")}</div>
        <Code>socks5://username:password@ip:port</Code>
        <div style={{ fontSize:11, color:"rgba(160,180,230,0.6)", marginTop:8 }}>
          {L(lang, "Example: socks5://user-123:pass456@gate.smartproxy.com:7000", "Приклад: socks5://user-123:pass456@gate.smartproxy.com:7000")}
        </div>
      </div>
      <Row icon="🏠" label={L(lang, "Residential (ISP)", "Residential (ISP)")} color={GREEN}
        desc={L(lang, "Best for aged accounts. Static IP assigned by ISP. Higher trust score.", "Найкраще для зрілих акаунтів. Статичний IP від провайдера. Більший рівень довіри.")} />
      <Row icon="📡" label={L(lang, "Mobile (4G/LTE)", "Mobile (4G/LTE)")} color={ACCENT}
        desc={L(lang, "Best for fresh account registration. Rotates like a real phone. Highest success rate.", "Найкраще для реєстрації свіжих акаунтів. Ротація як реальний телефон. Найвищий показник успіху.")} />
      <Row icon="🚫" label={L(lang, "Datacenter — Avoid!", "Datacenter — Уникайте!")} color={RED}
        desc={L(lang, "Telegram immediately flags and restricts accounts connected via datacenter IPs during registration.", "Telegram миттєво помічає та обмежує акаунти, підключені через datacenter-IP під час реєстрації.")} />
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4 }}>
        💡 {L(lang, "Match proxy country to the number country for best results.", "Для найкращих результатів підбирайте країну проксі до країни номера.")}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — Telegram API Credentials
// ═══════════════════════════════════════════════════════════════
function Slide6({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔑" text={L(lang, "Telegram API Credentials", "Облікові дані Telegram API")} color={GREEN} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "Every Telethon session needs an API ID and API Hash — these are tied to your registered Telegram application. You can use one pair for all accounts.",
          "Кожна Telethon-сесія потребує API ID та API Hash — вони прив'язані до вашого зареєстрованого додатку Telegram. Можна використовувати одну пару для всіх акаунтів."
        )}
      </div>
      <Step n={1} color={GREEN} title={L(lang, "Go to my.telegram.org", "Перейдіть на my.telegram.org")}
        desc={L(lang, "Log in with your personal Telegram account (not the accounts you're creating)", "Увійдіть своїм особистим акаунтом Telegram (не тим, що створюєте)")} />
      <Step n={2} color={GREEN} title={L(lang, "Create a new application", "Створіть новий додаток")}
        desc={L(lang, `Click "API development tools" → fill in app name (e.g. "MyApp"), platform "Other" → submit`, `Натисніть "API development tools" → заповніть назву (напр. "MyApp"), платформа "Other" → підтвердьте`)} />
      <Step n={3} color={GREEN} title={L(lang, "Save API ID and API Hash", "Збережіть API ID та API Hash")}
        desc={L(lang, "You'll see a numeric API ID and a 32-char hex Hash. Copy both.", "Ви побачите числовий API ID та 32-символьний hex Hash. Скопіюйте обидва.")} />
      <Step n={4} color={GREEN} title={L(lang, "Set environment variables (recommended)", "Встановіть змінні середовища (рекомендовано)")}
        desc={L(lang, "In Replit Secrets: TELETHON_API_ID = 12345678, TELETHON_API_HASH = abc123...", "В Replit Secrets: TELETHON_API_ID = 12345678, TELETHON_API_HASH = abc123...")} />
      <div style={card(PURPLE)}>
        <div style={{ fontSize:11, color:"rgba(196,174,255,0.8)", lineHeight:1.6 }}>
          {L(lang,
            "If env vars are set, you don't need to enter them in the form — the factory reads them automatically. Enter them in the form only if you need to override for a specific session.",
            "Якщо змінні середовища встановлені, вводити їх у форму не потрібно — фабрика читає їх автоматично. Введіть у форму лише якщо потрібно перевизначити для конкретної сесії."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — Registration Pipeline
// ═══════════════════════════════════════════════════════════════
function Slide7({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="⚡" text={L(lang, "7-Step Pipeline", "7-кроковий конвеєр")} color={ACCENT} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:14 }}>
        {L(lang, "All steps run automatically. Live progress shown in the stepper UI.", "Усі кроки виконуються автоматично. Живий прогрес відображається у степер-UI.")}
      </div>
      {[
        { n:1, icon:"🛒", en:"Purchase Number", ua:"Купівля номера",
          desc: L(lang, "POST to SMSPool API → receive order_id + phone number", "POST до SMSPool API → отримуємо order_id + номер телефону") },
        { n:2, icon:"📡", en:"Init Proxy Tunnel", ua:"Ініціалізація тунелю",
          desc: L(lang, "Create Telethon client with random device fingerprint + SOCKS5 proxy → connect", "Створення Telethon-клієнта з випадковим fingerprint пристрою + SOCKS5 проксі → підключення") },
        { n:3, icon:"💬", en:"Request Code", ua:"Запит коду",
          desc: L(lang, "client.send_code_request(phone) → Telegram sends SMS to the purchased number", "client.send_code_request(phone) → Telegram надсилає SMS на куплений номер") },
        { n:4, icon:"⏳", en:"Poll for SMS", ua:"Очікування SMS",
          desc: L(lang, "Poll SMSPool /sms/check every 5s. Timeout: 120s → auto-cancel order", "Опитуємо SMSPool /sms/check кожні 5с. Таймаут: 120с → автоматичне скасування замовлення") },
        { n:5, icon:"🤝", en:"Sign In / Sign Up", ua:"Вхід / Реєстрація",
          desc: L(lang, "Submit code to Telegram. Fresh number? Auto-generate name + sign_up()", "Надсилаємо код до Telegram. Свіжий номер? Автоматично генеруємо ім'я + sign_up()") },
        { n:6, icon:"🔒", en:"Set 2FA", ua:"Встановлення 2FA",
          desc: L(lang, "client.edit_2fa(new_password=...) immediately secures the account", "client.edit_2fa(new_password=...) — миттєво захищає акаунт") },
        { n:7, icon:"💾", en:"Save & Persist", ua:"Збереження",
          desc: L(lang, ".session file + .json metadata written to /sessions/ + DB row inserted", ".session файл + .json метадані записуються у /sessions/ + рядок вставляється у БД") },
      ].map(s => (
        <div key={s.n} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"10px 13px" }}>
          <div style={{ width:30, height:30, borderRadius:9, background:`${ACCENT}22`,
            border:`1.5px solid ${ACCENT}66`, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:14, flexShrink:0 }}>{s.icon}</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
              {s.n}. {lang === "ua" ? s.ua : s.en}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", lineHeight:1.45, marginTop:2 }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — Country Selection
// ═══════════════════════════════════════════════════════════════
function Slide8({ lang }: SL) {
  const countries = [
    { flag:"🇺🇦", code:"ua", en:"Ukraine",     ua:"Україна",     note: L(lang, "Best success rate, low cost", "Найкращий успіх, низька ціна") },
    { flag:"🇰🇿", code:"kz", en:"Kazakhstan",  ua:"Казахстан",   note: L(lang, "Very high success, cheap", "Дуже високий успіх, дешево") },
    { flag:"🇪🇪", code:"ee", en:"Estonia",     ua:"Естонія",     note: L(lang, "EU numbers, higher trust", "Номери ЄС, більший рівень довіри") },
    { flag:"🇱🇹", code:"lt", en:"Lithuania",   ua:"Литва",       note: L(lang, "EU, stable availability", "ЄС, стабільна доступність") },
    { flag:"🇵🇱", code:"pl", en:"Poland",      ua:"Польща",      note: L(lang, "EU, popular for high quality", "ЄС, популярний для якості") },
    { flag:"🇮🇳", code:"in", en:"India",       ua:"Індія",       note: L(lang, "Cheapest, lower trust score", "Найдешевші, нижчий рівень довіри") },
  ];
  return (
    <Shell>
      <STitle icon="🌍" text={L(lang, "Country Selection", "Вибір країни")} color={TEAL} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.6, marginBottom:16 }}>
        {L(lang,
          "Choose the country based on your target audience and budget. The phone number's country affects Telegram's trust level and FloodWait thresholds.",
          "Вибирайте країну виходячи з вашої цільової аудиторії та бюджету. Країна номера впливає на рівень довіри Telegram та пороги FloodWait."
        )}
      </div>
      {countries.map(c => (
        <div key={c.code} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:8,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"10px 14px" }}>
          <span style={{ fontSize:22, flexShrink:0 }}>{c.flag}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{lang === "ua" ? c.ua : c.en}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)" }}>{c.note}</div>
          </div>
          <div style={{ background:`${TEAL}18`, border:`1px solid ${TEAL}44`, borderRadius:6,
            padding:"2px 8px", fontSize:11, color:TEAL, fontWeight:700, flexShrink:0 }}>{c.code}</div>
        </div>
      ))}
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:8, lineHeight:1.5 }}>
        {L(lang, "Custom ID: enter any SMSPool country ID or ISO code directly if your target isn't in the dropdown.", "Custom ID: введіть будь-який country ID або ISO-код SMSPool безпосередньо, якщо потрібної країни немає у списку.")}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — Batch Mode
// ═══════════════════════════════════════════════════════════════
function Slide9({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📦" text={L(lang, "Batch Mode", "Пакетний режим")} color={PURPLE} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "Batch mode lets you register up to 10 accounts in a single session. Each account runs through the full 7-step pipeline sequentially with a 12-second cooldown between registrations.",
          "Пакетний режим дозволяє зареєструвати до 10 акаунтів за одну сесію. Кожен акаунт проходить повний 7-кроковий конвеєр послідовно з 12-секундною паузою між реєстраціями."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:8 }}>{L(lang, "How to use Batch Mode", "Як використовувати пакетний режим")}</div>
        <Step n={1} color={PURPLE} title={L(lang, "Set Quantity", "Встановіть кількість")}
          desc={L(lang, "Use the + / − stepper to choose 1–10 accounts. Default is 1 (single mode).", "Використовуйте кнопки + / − для вибору 1–10 акаунтів. За замовчуванням 1 (одиночний режим).")} />
        <Step n={2} color={PURPLE} title={L(lang, "Launch — one click", "Запуск — один клік")}
          desc={L(lang, `The button changes to "Launch Batch (N accounts)". Press it once and walk away.`, `Кнопка змінюється на "Запустити пакет (N акаунтів)". Натисніть один раз і займайтесь своїми справами.`)} />
        <Step n={3} color={PURPLE} title={L(lang, "Monitor progress", "Моніторинг прогресу")}
          desc={L(lang, "A progress bar at the top shows Account N of M + ✓/✕ counters. The 7-step stepper resets for each account.", "Прогрес-бар зверху показує акаунт N з M + лічильники ✓/✕. 7-кроковий степер скидається для кожного акаунта.")} />
      </div>
      <Row icon="⏱" label={L(lang, "12s cooldown", "12с пауза")} color={ACCENT}
        desc={L(lang, "A countdown between registrations prevents flood-trigger on Telegram's anti-spam. Phones registered sequentially, not in parallel.", "Відлік між реєстраціями запобігає тригеру флуду в антиспамі Telegram. Телефони реєструються послідовно, не паралельно.")} />
      <Row icon="⏹" label={L(lang, "Abort anytime", "Скасувати будь-коли")} color={RED}
        desc={L(lang, "The Abort button stops the batch mid-run. Already-registered accounts remain in your CRM.", "Кнопка Abort зупиняє пакет на ходу. Вже зареєстровані акаунти залишаються у CRM.")} />
      <Row icon="🎉" label={L(lang, "Batch Summary", "Підсумок пакету")} color={GREEN}
        desc={L(lang, "When done: shows N/M succeeded with the list of registered phone numbers.", "Після завершення: показує N/M успішних з переліком зареєстрованих номерів.")} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — Session Files & JSON Metadata
// ═══════════════════════════════════════════════════════════════
function Slide10({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="💾" text={L(lang, "Sessions & Metadata", "Сесії та метадані")} color={GREEN} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:14 }}>
        {L(lang,
          "After successful registration, two files are written to the ./sessions/ directory and a database row is inserted.",
          "Після успішної реєстрації два файли записуються у директорію ./sessions/ та вставляється рядок у базу даних."
        )}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>📄 {L(lang, "File structure", "Структура файлів")}</div>
        <Code>sessions/380XXXXXXXXX.session</Code>
        <Code>sessions/380XXXXXXXXX.json</Code>
      </div>
      <div style={card(BLUE)}>
        <div style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:6 }}>📋 JSON {L(lang, "schema", "схема")}</div>
        <Code>{`{
  "session_file_name": "380XXX.session",
  "phone": "+380XXXXXXXXX",
  "api_id": 12345678,
  "api_hash": "abc123...",
  "device_model": "Samsung Galaxy S23",
  "system_version": "Android 13",
  "app_version": "9.6.3",
  "lang_code": "en",
  "system_lang_code": "en-US",
  "proxy_string": "socks5://..."
}`}</Code>
      </div>
      <Row icon="🗄" label={L(lang, "Database row", "Рядок у БД")} color={TEAL}
        desc={L(lang, "sender_accounts table: phone, two_factor_pass, session_file, proxy, auth_status='active', is_active=1", "таблиця sender_accounts: phone, two_factor_pass, session_file, proxy, auth_status='active', is_active=1")} />
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:8 }}>
        {L(lang, "The .session file is a Telethon SQLite database — do not delete or move it. The .json is a portable metadata backup.", "Файл .session — це SQLite база даних Telethon — не видаляйте та не переміщуйте його. .json — портативний бекап метаданих.")}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — Error Handling & Anti-Ban
// ═══════════════════════════════════════════════════════════════
function Slide11({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🛡️" text={L(lang, "Error Handling & Anti-Ban", "Обробка помилок та анти-бан")} color={RED} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:14 }}>
        {L(lang, "The factory handles all known failure modes automatically:", "Фабрика автоматично обробляє всі відомі збої:")}
      </div>
      {[
        { icon:"🚫", color:RED, en:"PhoneNumberBannedError", ua:"PhoneNumberBannedError",
          desc: L(lang, "Telegram instantly bans the number → SMSPool order auto-cancelled → no charge. Try again with a different country.", "Telegram миттєво банить номер → замовлення SMSPool автоматично скасовується → без оплати. Спробуйте іншу країну.") },
        { icon:"⏱", color:ACCENT, en:"SMS Timeout (120s)", ua:"Таймаут SMS (120с)",
          desc: L(lang, "No code received in 2 minutes → SMSPool order cancelled → Telethon disconnected safely. Reattempt.", "Код не надійшов за 2 хвилини → замовлення SMSPool скасовано → Telethon відключено безпечно. Повторіть спробу.") },
        { icon:"🔐", color:PURPLE, en:"SessionPasswordNeededError", ua:"SessionPasswordNeededError",
          desc: L(lang, "Number already has 2FA → can't auto-register. The number was previously registered. Use a fresh number.", "Номер вже має 2FA → автоматична реєстрація неможлива. Номер був раніше зареєстрований. Використайте свіжий номер.") },
        { icon:"🌐", color:BLUE, en:"Proxy / Network Error", ua:"Помилка проксі / мережі",
          desc: L(lang, "Connection via proxy fails → error shown, client disconnected. Check proxy format and availability.", "Підключення через проксі не вдалося → відображається помилка, клієнт відключено. Перевірте формат та доступність проксі.") },
        { icon:"📱", color:GREEN, en:"PhoneNumberUnoccupiedError", ua:"PhoneNumberUnoccupiedError",
          desc: L(lang, "Fresh number with no Telegram account → factory auto-generates a random name and calls sign_up(). Normal flow.", "Свіжий номер без акаунту Telegram → фабрика автоматично генерує випадкове ім'я та викликає sign_up(). Нормальний процес.") },
      ].map(e => (
        <div key={e.en} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10,
          background:GLASS, border:`1px solid ${e.color}22`, borderRadius:12, padding:"10px 13px" }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${e.color}20`,
            border:`1.5px solid ${e.color}44`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:16, flexShrink:0 }}>{e.icon}</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:e.color, marginBottom:2 }}>
              {lang === "ua" ? e.ua : e.en}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", lineHeight:1.45 }}>{e.desc}</div>
          </div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — Best Practices
// ═══════════════════════════════════════════════════════════════
function Slide12({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="✅" text={L(lang, "Best Practices", "Найкращі практики")} color={GREEN} />
      {[
        { icon:"🌍", color:BLUE, en:"Match proxy country to phone country", ua:"Підбирайте країну проксі до країни номера",
          desc: L(lang, "A Ukrainian number behind a Ukrainian residential proxy has the highest trust score.", "Український номер за українським residential проксі має найвищий рівень довіри.") },
        { icon:"🔒", color:PURPLE, en:"Always use a strong 2FA password", ua:"Завжди використовуйте надійний пароль 2FA",
          desc: L(lang, "Min 12 chars, mix letters/digits/symbols. This prevents account hijacking if the number is later recycled.", "Мін. 12 символів, комбінація букв/цифр/символів. Це захищає від захоплення акаунту якщо номер пізніше перепродають.") },
        { icon:"📦", color:ACCENT, en:"Max 5 accounts per batch per hour", ua:"Максимум 5 акаунтів за пакет на годину",
          desc: L(lang, "Registering too many accounts from the same IP in a short window increases ban risk. Keep batches ≤5.", "Реєстрація занадто багатьох акаунтів з одного IP за короткий час збільшує ризик бану. Тримайте пакети ≤5.") },
        { icon:"⏳", color:TEAL, en:"Warm up before blasting", ua:"Прогрійте перед розсилкою",
          desc: L(lang, "Fresh accounts need 7–14 days of normal activity before bulk sending. Start with 20 msg/day, add 10/day per week.", "Свіжим акаунтам потрібно 7–14 днів нормальної активності перед масовою розсилкою. Починайте з 20 повідомлень/день, +10/день щотижня.") },
        { icon:"🗂", color:GREEN, en:"Validate immediately after creation", ua:"Валідуйте одразу після створення",
          desc: L(lang, "After registration, go to Accounts → validate the new session to confirm it's alive and the proxy connects.", "Після реєстрації перейдіть до Акаунти → перевірте нову сесію, щоб підтвердити що вона жива та проксі підключається.") },
        { icon:"🚫", color:RED, en:"Never re-use a proxy for >10 accounts/day", ua:"Не використовуйте проксі для >10 акаунтів/день",
          desc: L(lang, "Telegram correlates IPs across accounts. Rotate proxies to prevent subnet-level bans.", "Telegram корелює IP між акаунтами. Ротуйте проксі для запобігання банів на рівні підмережі.") },
      ].map(p => (
        <Row key={p.en} icon={p.icon} label={lang === "ua" ? p.ua : p.en} color={p.color} desc={p.desc} />
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE REGISTRY + MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12];
const TITLES_EN = ["Cover","What is it?","Prerequisites","SMSPool API","Decodo Proxy","API Credentials","7-Step Pipeline","Country Selection","Batch Mode","Sessions & Files","Error Handling","Best Practices"];
const TITLES_UA = ["Обкладинка","Що це?","Передумови","SMSPool API","Decodo Проксі","API Credentials","7-кроковий конвеєр","Вибір країни","Пакетний режим","Сесії та файли","Обробка помилок","Найкращі практики"];
const KEYWORDS_EN = ["","automated registration telethon smspool proxy","prerequisites smspool decodo credentials","smspool api key purchase number service","decodo smartproxy socks5 residential mobile","telegram api id hash my.telegram.org","pipeline steps 7 telethon sign","country ukraine kazakhstan estonia poland india","batch mode quantity multiple accounts","session json metadata file storage","error ban timeout proxy network","best practices warmup validate proxy rotate"];
const KEYWORDS_UA = ["","автоматична реєстрація телетон смспул проксі","передумови смспул декодо credentials","смспул апі ключ купівля номер сервіс","декодо смартпроксі socks5 residential mobile","телеграм апі id hash my.telegram.org","конвеєр кроки 7 телетон вхід","країна україна казахстан естонія польща індія","пакетний режим кількість кілька акаунтів","сесія json метадані файл зберігання","помилка бан таймаут проксі мережа","найкращі практики прогрів перевірка ротація"];

export function ManualFactoryPage({ onClose }: Props) {
  const { lang } = useI18n();
  const [current, setCurrent] = useState(0);
  const [search,  setSearch]  = useState("");
  const touchStartX = useRef(0);

  const titles   = lang === "ua" ? TITLES_UA : TITLES_EN;
  const keywords = lang === "ua" ? KEYWORDS_UA : KEYWORDS_EN;
  const total    = SLIDES.length;

  const filtered = search.trim().length > 0
    ? SLIDES.map((_, i) => i).filter(i =>
        titles[i]?.toLowerCase().includes(search.toLowerCase()) ||
        keywords[i]?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  function go(dir: number) {
    setCurrent(c => Math.max(0, Math.min(total - 1, c + dir)));
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0]!.clientX; }, []);
  const onTouchEnd   = useCallback((e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0]!.clientX;
    if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1);
  }, []);

  const SlideComp = SLIDES[current]!;

  return (
    <div style={{ position:"absolute", inset:0, background:BG, display:"flex", flexDirection:"column", zIndex:210 }}>
      {/* Header */}
      <div style={{ flexShrink:0, padding:"14px 16px 10px",
        borderBottom:`1px solid ${BORDER}`, background:"rgba(7,9,20,0.9)",
        backdropFilter:"blur(20px)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:34, height:34, borderRadius:11, background:`${ACCENT}22`,
          border:`1.5px solid ${ACCENT}55`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:18, flexShrink:0 }}>🏭</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>
            {L(lang, "Account Factory Guide", "Довідник: Фабрика акаунтів")}
          </div>
          <div style={{ fontSize:10, color:`${ACCENT}99` }}>
            {total} {L(lang, "pages", "сторінок")} · SMSPool · Decodo · Telethon
          </div>
        </div>
        <button onClick={onClose} style={{ background:GLASS2, border:`1px solid ${BORDER2}`,
          borderRadius:10, padding:"7px 10px", color:"rgba(255,255,255,0.55)", cursor:"pointer",
          display:"flex", alignItems:"center" }}>
          ✕
        </button>
      </div>

      {/* Search */}
      <div style={{ flexShrink:0, padding:"10px 16px 8px", borderBottom:`1px solid ${BORDER}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={L(lang, "Search pages…", "Пошук сторінок…")}
          style={{ width:"100%", boxSizing:"border-box", background:GLASS2,
            border:`1px solid ${BORDER2}`, borderRadius:10, padding:"9px 14px",
            fontSize:13, color:"rgba(226,232,255,0.85)", fontFamily:"inherit", outline:"none" }}
        />
        {filtered && (
          <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
            {filtered.map(i => (
              <button key={i} onClick={() => { setCurrent(i); setSearch(""); }}
                style={{ background:`${ACCENT}18`, border:`1px solid ${ACCENT}44`, borderRadius:8,
                  padding:"5px 12px", fontSize:11, color:ACCENT, cursor:"pointer", fontWeight:600 }}>
                {i + 1}. {titles[i]}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", padding:"4px 0" }}>
                {L(lang, "No results", "Немає результатів")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <SlideComp lang={lang as Lang} />
      </div>

      {/* Bottom nav */}
      <div style={{ flexShrink:0, padding:"10px 16px calc(env(safe-area-inset-bottom,0px) + 10px)",
        borderTop:`1px solid ${BORDER}`, background:"rgba(7,9,20,0.85)", backdropFilter:"blur(20px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => go(-1)} disabled={current === 0}
            style={{ background:GLASS2, border:`1px solid ${BORDER2}`, borderRadius:10,
              padding:"8px 14px", fontSize:13, color: current === 0 ? "rgba(255,255,255,0.2)" : "#fff",
              cursor: current === 0 ? "default" : "pointer", flexShrink:0 }}>←</button>
          <div style={{ flex:1, display:"flex", justifyContent:"center", alignItems:"center", gap:4, flexWrap:"wrap" }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setCurrent(i)}
                style={{ width: i === current ? 18 : 6, height:6, borderRadius:3, cursor:"pointer",
                  background: i === current ? ACCENT : "rgba(255,255,255,0.18)",
                  transition:"all 0.25s ease" }} />
            ))}
          </div>
          <button onClick={() => go(1)} disabled={current === total - 1}
            style={{ background:GLASS2, border:`1px solid ${BORDER2}`, borderRadius:10,
              padding:"8px 14px", fontSize:13, color: current === total - 1 ? "rgba(255,255,255,0.2)" : "#fff",
              cursor: current === total - 1 ? "default" : "pointer", flexShrink:0 }}>→</button>
        </div>
        <div style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:6 }}>
          {current + 1} / {total} — {titles[current]}
        </div>
      </div>
    </div>
  );
}
