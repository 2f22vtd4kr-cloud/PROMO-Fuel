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
      <Step n={3} color={ACCENT} title={L(lang, "Check live availability before registering", "Перевірте наявність у реальному часі перед реєстрацією")}
        desc={L(lang, `Enter your API key, then tap "📊 Check Stock" next to the Country field — see every country's real-time stock and price sorted cheapest first.`, `Введіть API ключ, потім натисніть "📊 Наявність" поруч із полем Країна — побачите наявність та ціну для кожної країни, відсортованої від дешевшої.`)} />
      <Step n={4} color={ACCENT} title={L(lang, "Choose country wisely", "Оберіть країну мудро")}
        desc={L(lang, "Ukraine (ua), Kazakhstan (kz), Estonia (ee) have the best success rates for Telegram numbers.", "Україна (ua), Казахстан (kz), Естонія (ee) мають найкращі показники успіху для Telegram-номерів.")} />
      <div style={card(TEAL)}>
        <div style={{ fontSize:12, fontWeight:700, color:TEAL, marginBottom:6 }}>
          📊 {L(lang, "Real-Time Stock Checker", "Перевірка наявності в реальному часі")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "The \"Check Stock\" button calls GET /api/factory/countries and shows all countries with Telegram numbers in stock, sorted by price. 🟢 >50 | 🟡 10–50 | 🔴 <10. Results are cached for 60 seconds. Click any country to select it instantly.",
            "Кнопка \"Наявність\" викликає GET /api/factory/countries та показує всі країни з наявними Telegram-номерами, відсортованими за ціною. 🟢 >50 | 🟡 10–50 | 🔴 <10. Результати кешуються на 60 секунд. Натисніть на будь-яку країну, щоб одразу вибрати її."
          )}
        </div>
      </div>
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
      <div style={card(TEAL)}>
        <div style={{ fontSize:12, fontWeight:700, color:TEAL, marginBottom:6 }}>
          🔌 {L(lang, "Two-stage Proxy Verification", "Двоетапна перевірка проксі")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Stage 1 — TCP pre-check (before Step 1): factory opens a raw SOCKS5 socket to Telegram DC1 (149.154.167.91:443). Fails immediately if the proxy is down — no SMSPool balance spent.\n\nStage 2 — Telethon confirmation (Step 2): the step 2 completion message now shows the actual proxy host:port it is routing through (e.g. \"via gate.smartproxy.com:7000\"). If you see only \"Telethon connected\" with no \"via …\" — proxy was not applied.",
            "Етап 1 — TCP перевірка (до кроку 1): відкривається raw SOCKS5-з'єднання до Telegram DC1. Одразу зупиняється якщо проксі недоступний — без витрат SMSPool.\n\nЕтап 2 — Підтвердження Telethon (крок 2): повідомлення про завершення кроку 2 тепер показує фактичний хост:порт проксі (напр. \"via gate.smartproxy.com:7000\"). Якщо бачите лише \"Telethon connected\" без \"via …\" — проксі не застосовано."
          )}
        </div>
      </div>
      <div style={{ ...card(RED), marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:RED, marginBottom:6 }}>
          ⚠️ {L(lang, "Critical: python-socks must be installed", "Критично: python-socks має бути встановлено")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,160,160,0.75)", lineHeight:1.6 }}>
          {L(lang,
            "Telethon requires the python-socks[asyncio] package to route through a SOCKS5 proxy. Without it, Telethon silently ignores the proxy and connects from the server's bare datacenter IP — causing Telegram to return SentCodeTypeApp on 100% of numbers, burning your entire SMSPool balance.\n\nThe TCP pre-check passes even when python-socks is missing (it uses a raw socket, not Telethon). The factory now aborts before Step 1 if python-socks is not found. Required package: python-socks[asyncio] ≥2.8.2.",
            "Telethon потребує пакет python-socks[asyncio] для маршрутизації через SOCKS5 проксі. Без нього Telethon мовчки ігнорує проксі та підключається безпосередньо з datacenter IP сервера — через це Telegram повертає SentCodeTypeApp на 100% номерів, спалюючи весь баланс SMSPool.\n\nTCP перевірка проходить навіть без python-socks (вона використовує raw socket, не Telethon). Фабрика тепер зупиняється до кроку 1 якщо python-socks не знайдено. Потрібний пакет: python-socks[asyncio] ≥2.8.2."
          )}
        </div>
      </div>
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
      <STitle icon="⚡" text={L(lang, "8-Step Pipeline", "8-кроковий конвеєр")} color={ACCENT} />
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
        { n:7, icon:"👤", en:"Profile Setup", ua:"Налаштування профілю",
          desc: L(lang, "AI (Gemini) generates name + bio + picks avatar from pending_avatars/, or manual fields used if Manual mode selected. Avatar moved to used_avatars/ after apply.", "AI (Gemini) генерує ім'я + біо + вибирає аватар з pending_avatars/, або ручні поля якщо обраний ручний режим. Аватар переміщується до used_avatars/ після встановлення.") },
        { n:8, icon:"💾", en:"Save & Add to CRM", ua:"Збереження в CRM",
          desc: L(lang, ".session file + .json metadata written to /sessions/ + DB row inserted in sender_accounts", ".session файл + .json метадані записуються у /sessions/ + рядок вставляється у таблицю sender_accounts") },
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
    { flag:"🇰🇭", code:"kh", en:"Cambodia",    ua:"Камбоджа",    fresh:87, avg:1.2, note: L(lang, "🥇 Top pick — 87% fresh, ~1.2 attempts. Cheapest tier.", "🥇 Топ вибір — 87% свіжих, ~1.2 спроб. Найдешевший тир."), color:GREEN },
    { flag:"🇱🇦", code:"la", en:"Laos",         ua:"Лаос",        fresh:85, avg:1.3, note: L(lang, "🥈 85% fresh, ~1.3 attempts. Very stable pool.", "🥈 85% свіжих, ~1.3 спроб. Дуже стабільний пул."), color:GREEN },
    { flag:"🇲🇲", code:"mm", en:"Myanmar",      ua:"М'янма",      fresh:83, avg:1.4, note: L(lang, "🥉 83% fresh, ~1.4 attempts. Low cost, growing pool.", "🥉 83% свіжих, ~1.4 спроб. Низька ціна, пул зростає."), color:GREEN },
    { flag:"🇰🇿", code:"kz", en:"Kazakhstan",  ua:"Казахстан",   fresh:76, avg:1.5, note: L(lang, "#4 — 76% fresh. Pool strained after SMS-Activate shutdown.", "#4 — 76% свіжих. Пул під тиском після закриття SMS-Activate."), color:ACCENT },
    { flag:"🇺🇦", code:"ua", en:"Ukraine",      ua:"Україна",     fresh:71, avg:1.6, note: L(lang, "#5 — 71% fresh. High availability but more recycled numbers.", "#5 — 71% свіжих. Висока доступність, але більше переробки."), color:ACCENT },
    { flag:"🇵🇭", code:"ph", en:"Philippines", ua:"Філіппіни",   fresh:68, avg:1.7, note: L(lang, "#6 — 68% fresh. Large pool, moderate freshness.", "#6 — 68% свіжих. Великий пул, помірна свіжість."), color:TEAL },
  ];
  return (
    <Shell>
      <STitle icon="🌍" text={L(lang, "Country Selection", "Вибір країни")} color={TEAL} />
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6, marginBottom:12 }}>
        {L(lang,
          "Rankings based on real community data (BlackHatWorld, Reddit, Trustpilot, June 2026). Use AI-вибір in the factory for live AI-ranked recommendations.",
          "Рейтинги на основі реальних даних спільноти (BlackHatWorld, Reddit, Trustpilot, червень 2026). Використовуйте AI-вибір у фабриці для живих рекомендацій."
        )}
      </div>
      <div style={card(TEAL)}>
        <div style={{ fontSize:12, fontWeight:700, color:TEAL, marginBottom:6 }}>
          📊 {L(lang, "Use Live Stock Checker + AI-вибір", "Використовуйте перевірку наявності + AI-вибір")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>
          {L(lang,
            `Tap "📊 Check Stock" next to the Country field for real-time availability. Or tap "+ AI Вибір" (purple button) for a ranked list with freshness % and avg attempts per country.`,
            `Натисніть "📊 Наявність" для наявності в реальному часі. Або натисніть "+ AI Вибір" (фіолетова кнопка) для рейтингу зі свіжістю % та середньою кількістю спроб.`
          )}
        </div>
      </div>
      {countries.map(c => (
        <div key={c.code} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:8,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"10px 14px" }}>
          <span style={{ fontSize:22, flexShrink:0 }}>{c.flag}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{lang === "ua" ? c.ua : c.en}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)", marginTop:1 }}>{c.note}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
            <div style={{ background:`${c.color}18`, border:`1px solid ${c.color}44`, borderRadius:6,
              padding:"2px 7px", fontSize:11, color:c.color, fontWeight:700 }}>{c.fresh}%</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)" }}>≈{c.avg} {L(lang, "att.","спроб")}</div>
          </div>
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
          "Batch mode lets you register up to 20 accounts in a single session. Each account runs through the full 8-step pipeline sequentially with a 12-second cooldown between registrations.",
          "Пакетний режим дозволяє зареєструвати до 20 акаунтів за одну сесію. Кожен акаунт проходить повний 8-кроковий конвеєр послідовно з 12-секундною паузою між реєстраціями."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:8 }}>{L(lang, "How to use Batch Mode", "Як використовувати пакетний режим")}</div>
        <Step n={1} color={PURPLE} title={L(lang, "Set Quantity", "Встановіть кількість")}
          desc={L(lang, "Use the + / − stepper to choose 1–20 accounts. Default is 1 (single mode).", "Використовуйте кнопки + / − для вибору 1–20 акаунтів. За замовчуванням 1 (одиночний режим).")} />
        <Step n={2} color={PURPLE} title={L(lang, "Launch — one click", "Запуск — один клік")}
          desc={L(lang, `The button changes to "Launch Batch (N accounts)". Press it once and walk away.`, `Кнопка змінюється на "Запустити пакет (N акаунтів)". Натисніть один раз і займайтесь своїми справами.`)} />
        <Step n={3} color={PURPLE} title={L(lang, "Monitor progress", "Моніторинг прогресу")}
          desc={L(lang, "A progress bar at the top shows Account N of M + ✓/✕ counters. The 8-step stepper resets for each account.", "Прогрес-бар зверху показує акаунт N з M + лічильники ✓/✕. 8-кроковий степер скидається для кожного акаунта.")} />
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
        { icon:"🔌", color:TEAL, en:"Proxy Pre-check Failed (before Step 1)", ua:"Помилка перевірки проксі (до кроку 1)",
          desc: L(lang, "Factory tests SOCKS5 to Telegram DC1 (149.154.167.91:443) before buying any number. If it fails → pipeline aborts instantly, no SMSPool balance spent. Fix proxy string and retry.", "Фабрика тестує SOCKS5 до Telegram DC1 (149.154.167.91:443) перед купівлею будь-якого номера. Якщо не вдається → конвеєр зупиняється миттєво, баланс SMSPool не витрачається. Виправте рядок проксі та повторіть.") },
        { icon:"🚫", color:RED, en:"PhoneNumberBannedError", ua:"PhoneNumberBannedError",
          desc: L(lang, "Telegram instantly bans the number → SMSPool order auto-cancelled → no charge. Try again with a different country.", "Telegram миттєво банить номер → замовлення SMSPool автоматично скасовується → без оплати. Спробуйте іншу країну.") },
        { icon:"⏱", color:ACCENT, en:"SMS Timeout (120s)", ua:"Таймаут SMS (120с)",
          desc: L(lang, "No code received in 2 minutes → SMSPool order cancelled → Telethon disconnected safely. Reattempt.", "Код не надійшов за 2 хвилини → замовлення SMSPool скасовано → Telethon відключено безпечно. Повторіть спробу.") },
        { icon:"🔐", color:PURPLE, en:"SessionPasswordNeededError", ua:"SessionPasswordNeededError",
          desc: L(lang, "Number already has 2FA → can't auto-register. The number was previously registered. Use a fresh number.", "Номер вже має 2FA → автоматична реєстрація неможлива. Номер був раніше зареєстрований. Використайте свіжий номер.") },
        { icon:"🌐", color:BLUE, en:"Proxy / Network Error (during pipeline)", ua:"Помилка проксі / мережі (під час конвеєру)",
          desc: L(lang, "Proxy passes pre-check but drops mid-registration → error shown, client disconnected. Intermittent proxies cause this.", "Проксі проходить перевірку, але відключається під час реєстрації → відображається помилка, клієнт відключено. Викликається нестабільними проксі.") },
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
// SLIDE 12 — Warmup Mode Selector
// ═══════════════════════════════════════════════════════════════
function Slide12({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔥" text={L(lang, "Warmup Mode Selector", "Вибір режиму прогріву")} color={ACCENT} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "The first card in Account Factory lets you choose whether and how newly created accounts receive the 48-hour warmup treatment. The setting applies to the entire batch.",
          "Перша картка у Фабриці акаунтів дозволяє вибрати, чи і як щойно створені акаунти проходять 48-годинний прогрів. Налаштування застосовується до всього пакету."
        )}
      </div>

      {[
        {
          icon:"🚫", color:RED,
          en:"No Warmup",      ua:"Без прогріву",
          descEn:"Skip warmup entirely. Every registered account goes straight to 'active' status. Use only when accounts are already aged or you have other warmup plans.",
          descUa:"Пропустити прогрів повністю. Кожен зареєстрований акаунт відразу отримує статус 'active'. Використовуйте лише для вже прогрітих акаунтів або коли є інші плани прогріву.",
        },
        {
          icon:"🔥", color:ACCENT,
          en:"Warmup All (default)",    ua:"Прогріти всі (за замовчуванням)",
          descEn:"Auto-queue 48-hour warmup for every account immediately after Step 8 (Save & Add to CRM). No manual action required — the warmup badge appears on the account card.",
          descUa:"Автоматично поставити в чергу 48-год прогрів для кожного акаунта одразу після кроку 8 (Збереження в CRM). Жодних ручних дій — значок прогріву з'являється на картці акаунта.",
        },
        {
          icon:"❓", color:BLUE,
          en:"Ask Per Account",  ua:"Питати для кожного",
          descEn:"After each account is created, a popup appears with the phone number and two buttons: '🔥 Start Warmup' or 'Skip'. Useful in batch mode to selectively warm only some accounts.",
          descUa:"Після кожного акаунта з'являється попап із номером телефону та двома кнопками: '🔥 Почати прогрів' або 'Пропустити'. Зручно у пакетному режимі для вибіркового прогріву.",
        },
      ].map(opt => (
        <div key={opt.en} style={card(opt.color)}>
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${opt.color}20`,
              border:`1.5px solid ${opt.color}44`, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:17, flexShrink:0 }}>{opt.icon}</div>
            <div style={{ fontSize:13, fontWeight:800, color:opt.color }}>
              {L(lang, opt.en, opt.ua)}
            </div>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.55 }}>
            {L(lang, opt.descEn, opt.descUa)}
          </div>
        </div>
      ))}

      <div style={{ ...card(TEAL), marginTop:4 }}>
        <div style={{ fontSize:11, fontWeight:800, color:TEAL, marginBottom:6 }}>
          💡 {L(lang,"Tip: skip warmup & manually trigger later","Порада: пропустіть прогрів та запустіть вручну пізніше")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.5 }}>
          {L(lang,
            "If you chose No Warmup, you can still start warmup any time from Accounts → 🔥 button on each account card.",
            "Якщо обрано 'Без прогріву', ви завжди можете запустити прогрів з Акаунти → кнопка 🔥 на картці кожного акаунта."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — Best Practices
// ═══════════════════════════════════════════════════════════════
function Slide13({ lang }: SL) {
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
// SLIDE 14 — Proxy Store & Session Tracking
// ═══════════════════════════════════════════════════════════════
function Slide14({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📦" text={L(lang, "Proxy Store & Session Tracking", "Сховище проксі та сесії")} color={PURPLE} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:16 }}>
        {L(lang,
          "The Proxy Store saves your SOCKS5 proxy strings per country with automatic session-number tracking — each new batch picks up exactly where the last one ended, preventing reuse bans.",
          "Сховище проксі зберігає ваші SOCKS5 проксі по країнах з автоматичним відстеженням номерів сесій — кожен новий пакет починається там, де закінчився попередній, запобігаючи банам через повторне використання."
        )}
      </div>
      <Row icon="💾" color={ACCENT} label={L(lang, "Save a proxy per country", "Збережіть проксі для країни")}
        desc={L(lang, "Enter a proxy URL, pick a country, then tap 💾 Save. It's stored in the Proxy Store under that country code for instant autofill next time.", "Введіть URL проксі, оберіть країну, потім натисніть 💾 Зберегти. Він зберігається у Сховищі проксі для автозаповнення наступного разу.")} />
      <Row icon="⚡" color={BLUE} label={L(lang, "Autofill chips on country select", "Чіпи автозаповнення при виборі країни")}
        desc={L(lang, "Saved proxies for the selected country appear as tappable chips above the proxy field. Tapping one fills the proxy AND sets the Session Start # to last_session_num + 1 automatically.", "Збережені проксі для вибраної країни з'являються як чіпи над полем проксі. Натискання заповнює проксі І встановлює Початковий № сесії на last_session_num + 1 автоматично.")} />
      <Row icon="🔢" color={GREEN} label={L(lang, "Auto-increment after each batch", "Автоінкремент після кожного пакету")}
        desc={L(lang, "After a successful batch finishes, last_session_num is updated silently. Next time you select the same proxy the start number is already correct — zero duplicates, zero gaps.", "Після успішного завершення пакету last_session_num оновлюється автоматично. Наступного разу початковий номер вже правильний — нуль дублікатів, нуль прогалин.")} />
      <Row icon="🗂" color={TEAL} label={L(lang, "Manage all proxies from Proxy Store panel", "Керуйте всіма проксі з панелі Сховища")}
        desc={L(lang, "Tap 📦 Proxy Store in the proxy field header to open the full manager — see all saved entries grouped by country, with their last session number and a delete button.", "Натисніть 📦 Proxy Store в заголовку поля проксі, щоб відкрити повний менеджер — всі збережені записи по країнах, з останнім номером сесії та кнопкою видалення.")} />
      <Row icon="🗑️" color={RED} label={L(lang, "Delete when proxy source changes", "Видаліть при зміні джерела проксі")}
        desc={L(lang, "When you buy a new Decodo plan or the proxy URL changes, delete the old entry from the store. This prevents stale URLs from autofilling and breaking registrations.", "Якщо ви купили новий план Decodo або URL проксі змінився — видаліть старий запис зі сховища. Це запобігає автозаповненню застарілих URL та зламаним реєстраціям.")} />
      <div style={{ ...card(PURPLE), marginTop:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:PURPLE, marginBottom:6 }}>
          {L(lang, "Continue-From Example", "Приклад продовження")}
        </div>
        <div style={{ fontFamily:"monospace", fontSize:11, color:"rgba(200,200,255,0.75)", lineHeight:1.8 }}>
          {L(lang,
            "Batch 1: prefix=ua, start=1 → ua-1, ua-2, ua-3\nafter batch: last_session_num=3\nBatch 2 (autofill): start=4 → ua-4, ua-5, ua-6",
            "Пакет 1: prefix=ua, start=1 → ua-1, ua-2, ua-3\nпісля пакету: last_session_num=3\nПакет 2 (автозаповнення): start=4 → ua-4, ua-5, ua-6"
          ).split("\n").map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 15 — AI-вибір (AI Country Picker)
// ═══════════════════════════════════════════════════════════════
function Slide15({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🤖" text={L(lang, "AI Country Picker (AI-вибір)", "AI-вибір країни")} color={PURPLE} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:14 }}>
        {L(lang,
          "The \"+ AI Вибір\" button opens a live-ranked panel of countries sorted by freshness and average attempt count — powered by Gemini AI and backed by real community research.",
          "Кнопка \"+ AI Вибір\" відкриває живий рейтинг країн, відсортованих за свіжістю та середньою кількістю спроб — на основі Gemini AI та реальних даних спільноти."
        )}
      </div>

      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:8 }}>
          {L(lang, "How to use", "Як користуватись")}
        </div>
        <Step n={1} color={PURPLE}
          title={L(lang, `Tap "+ AI Вибір"`, `Натисніть "+ AI Вибір"`)}
          desc={L(lang,
            "The purple button appears below the Country field. One tap triggers Gemini to rank all countries based on the latest community research.",
            "Фіолетова кнопка під полем Країна. Один дотик запускає Gemini для ранжування країн на основі останніх даних спільноти."
          )} />
        <Step n={2} color={PURPLE}
          title={L(lang, "Read the ranked list", "Читайте рейтинговий список")}
          desc={L(lang,
            "Each row shows: 🥇/🥈/🥉 rank, country name, freshness bar + %, avg attempts pill, data source badge (🔬 our DB / 📊 community / 🤖 AI estimate), and reasoning.",
            "Кожен рядок: 🥇/🥈/🥉 ранг, назва країни, смуга свіжості + %, пігулка середніх спроб, значок джерела (🔬 наш DB / 📊 спільнота / 🤖 AI оцінка) та обґрунтування."
          )} />
        <Step n={3} color={PURPLE}
          title={L(lang, "Tap a row to select", "Натисніть рядок для вибору")}
          desc={L(lang,
            "Tapping any country row instantly sets that country in the form. The selected row highlights purple with a dot indicator.",
            "Натискання рядка миттєво встановлює цю країну у формі. Вибраний рядок підсвічується фіолетовим з точкою-індикатором."
          )} />
      </div>

      <Row icon="📊" color={TEAL} label={L(lang, "Freshness %", "Свіжість %")}
        desc={L(lang,
          "How likely the next number from this country's SMSPool is a brand-new SIM that has never had a Telegram account — higher is better.",
          "Ймовірність того, що наступний номер з пулу SMSPool є абсолютно новою SIM-картою, яка ніколи не мала Telegram-акаунту — чим вище, тим краще."
        )} />
      <Row icon="🔢" color={PURPLE} label={L(lang, "≈ Attempts (avg_attempts)", "≈ Спроб (avg_attempts)")}
        desc={L(lang,
          "Average number of SMSPool purchases needed before a successful registration for this country. 1.2 = almost always 1 number. 2.0 = often needs 2. Lower is better — fewer wasted purchases.",
          "Середня кількість покупок SMSPool до успішної реєстрації для цієї країни. 1.2 = майже завжди 1 номер. 2.0 = часто потрібно 2. Нижче краще — менше витрат."
        )} />
      <Row icon="🔬" color={GREEN} label={L(lang, "Data sources", "Джерела даних")}
        desc={L(lang,
          "🔬 = accumulated from your own DB stats via the Report button · 📊 = BlackHatWorld / Reddit / Trustpilot community research (June 2026) · 🤖 = AI estimate when no other data",
          "🔬 = накопичено з власного DB через кнопку Звіт · 📊 = дані спільноти BlackHatWorld/Reddit/Trustpilot (червень 2026) · 🤖 = AI оцінка коли немає інших даних"
        )} />

      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:6, lineHeight:1.5 }}>
        💡 {L(lang,
          "Results are cached for 12 hours. Tap the refresh icon (⟳) inside the panel to force a regeneration with the latest data.",
          "Результати кешуються на 12 годин. Натисніть іконку оновлення (⟳) всередині панелі для примусового перегенерування з останніми даними."
        )}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 16 — Session Stats Strip
// ═══════════════════════════════════════════════════════════════
function Slide16({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📈" text={L(lang, "Session Stats Strip", "Стрічка статистики сесії")} color={ACCENT} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:14 }}>
        {L(lang,
          "A stats bar appears automatically below the 7-step pipeline once any money is spent or a recycled number is skipped. It shows your running totals for the current factory session.",
          "Стрічка статистики з'являється автоматично під 7-кроковим конвеєром, щойно витрачаються гроші або пропускається перероблений номер. Вона показує накопичені підсумки поточної сесії фабрики."
        )}
      </div>

      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, fontWeight:700, color:ACCENT, marginBottom:10 }}>
          💰 {L(lang, "Money Spent Counter", "Лічильник витрачених коштів")}
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:22, fontWeight:900, color:"#ffc832" }}>$0.47</span>
          <span style={{ fontSize:11, color:"rgba(255,200,50,0.55)" }}>{L(lang, "spent", "витрачено")}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.55 }}>
          {L(lang,
            "Accumulates the SMSPool cost of every number purchased in this session — including failed attempts where the number was banned or timed out. Resets when you close Account Factory.",
            "Накопичує вартість SMSPool кожного купленого в цій сесії номера — включно з невдалими спробами де номер був заблокований або закінчився таймаут. Скидається при закритті Фабрики акаунтів."
          )}
        </div>
      </div>

      <div style={card(RED)}>
        <div style={{ fontSize:12, fontWeight:700, color:RED, marginBottom:10 }}>
          ♻ {L(lang, "Recycled Number Counter", "Лічильник перероблених номерів")}
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:22, fontWeight:900, color:"#ff6b7a" }}>3</span>
          <span style={{ fontSize:11, color:"rgba(255,107,122,0.55)" }}>{L(lang, "recycled", "переробл.")}</span>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.55 }}>
          {L(lang,
            "Counts numbers that were already registered (SessionPasswordNeededError) — Telegram numbers re-sold by SMSPool with an existing 2FA account on them. The factory skips these automatically or prompts you to continue.",
            "Рахує номери, які вже були зареєстровані (SessionPasswordNeededError) — Telegram-номери перепродані SMSPool з вже існуючим 2FA акаунтом. Фабрика автоматично пропускає їх або запитує продовження."
          )}
        </div>
      </div>

      <Row icon="🌍" color={TEAL} label={L(lang, "Per-country breakdown", "Розбивка по країнах")}
        desc={L(lang,
          "The recycled counter shows the count for the currently selected country. If you registered with multiple countries in one session, a separate \"total recycled\" figure appears next to it.",
          "Лічильник перероблених показує кількість для поточно вибраної країни. Якщо в одній сесії реєстрували з кількох країн — поруч з'являється окрема цифра \"всього переробл.\""
        )} />
      <Row icon="🔄" color={GREEN} label={L(lang, "Resets on new session", "Скидається при новій сесії")}
        desc={L(lang,
          "The strip only tracks the current open factory session. Closing and reopening Account Factory starts fresh counters from zero.",
          "Стрічка відстежує лише поточну відкриту сесію фабрики. Закриття та повторне відкриття Фабрики акаунтів починає лічильники з нуля."
        )} />

      <div style={{ ...card(PURPLE), marginTop:6 }}>
        <div style={{ fontSize:11, color:"rgba(196,174,255,0.75)", lineHeight:1.55 }}>
          💡 {L(lang,
            "Use the recycled counter as a real-time freshness signal: if you see many recycled numbers on a country, switch to AI-вибір to pick a fresher source.",
            "Використовуйте лічильник перероблених як сигнал свіжості в реальному часі: якщо бачите багато переробки для країни — перейдіть до AI-вибір, щоб знайти свіжіше джерело."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 17 — AI Feedback Loop (Report Freshness)
// ═══════════════════════════════════════════════════════════════
function Slide17({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔬" text={L(lang, "AI Feedback Loop", "Зворотній зв'язок AI")} color={GREEN} />
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:14 }}>
        {L(lang,
          "Every time you use AI-вибір and register accounts, you can report your real experience back to the system — so future AI rankings are based on your own data, not just community estimates.",
          "Щоразу коли ви використовуєте AI-вибір та реєструєте акаунти, ви можете повідомити системі про реальний досвід — щоб майбутні рейтинги AI базувались на ваших власних даних, а не лише оцінках спільноти."
        )}
      </div>

      <div style={card(GREEN)}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:8 }}>
          {L(lang, "How the Report button works", "Як працює кнопка Звіт")}
        </div>
        <Step n={1} color={GREEN}
          title={L(lang, "Open AI-вибір panel", "Відкрийте панель AI-вибір")}
          desc={L(lang,
            "Tap \"+ AI Вибір\" to see the ranked country list. Each country row has a small grey \"🔬 Report result\" button at the bottom.",
            "Натисніть \"+ AI Вибір\" щоб побачити рейтинг. Кожен рядок країни має маленьку сіру кнопку \"🔬 Звіт\" внизу."
          )} />
        <Step n={2} color={GREEN}
          title={L(lang, "Tap \"🔬 Звіт\"", "Натисніть \"🔬 Звіт\"")}
          desc={L(lang,
            "Two inline buttons appear: \"✓ Fresh\" (green) and \"♻ Recycled\" (red). The row click-to-select action is paused while the report UI is open.",
            "З'являються дві вбудовані кнопки: \"✓ Свіжі\" (зелена) та \"♻ Переробл.\" (червона). Дія вибору рядка призупиняється поки відкритий UI звіту."
          )} />
        <Step n={3} color={GREEN}
          title={L(lang, "Tap Fresh or Recycled", "Натисніть Свіжі або Переробл.")}
          desc={L(lang,
            "One tap sends a stat to the database: type=success for fresh or type=recycled for recycled numbers. The button immediately shows a confirmation badge.",
            "Один дотик відправляє статистику в базу даних: type=success для свіжих або type=recycled для перероблених. Кнопка одразу показує значок підтвердження."
          )} />
      </div>

      <Row icon="📊" color={TEAL} label={L(lang, "What gets recorded", "Що записується")}
        desc={L(lang,
          "Each report increments either the successes or recycled column in factory_country_stats table. The AI reads these counters on the next 12h cache refresh — your data source badge changes from 📊 to 🔬.",
          "Кожен звіт збільшує стовпчик successes або recycled у таблиці factory_country_stats. AI зчитує ці лічильники при наступному оновленні кешу (12г) — значок джерела змінюється з 📊 на 🔬."
        )} />
      <Row icon="🔄" color={PURPLE} label={L(lang, "Feedback loop timeline", "Часова шкала зворотного зв'язку")}
        desc={L(lang,
          "After enough reports accumulate for a country, its ranking source badge flips from 📊 community to 🔬 our data. The AI ranking will now prioritize your real-world experience.",
          "Після накопичення достатньої кількості звітів для країни, значок джерела рейтингу змінюється з 📊 спільнота на 🔬 наші дані. AI буде пріоритизувати ваш реальний досвід."
        )} />

      <div style={{ ...card(ACCENT), marginTop:6 }}>
        <div style={{ fontSize:11, fontWeight:700, color:ACCENT, marginBottom:6 }}>
          💡 {L(lang, "Pro tip — report after every batch", "Порада — звітуйте після кожного пакету")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", lineHeight:1.55 }}>
          {L(lang,
            "After each batch finishes, open AI-вибір, find the country you used, and tap Report. Over a week of reporting you'll have your own freshness data that consistently outperforms generic community estimates.",
            "Після кожного пакету відкрийте AI-вибір, знайдіть країну яку використовували, та натисніть Звіт. За тиждень звітності ви матимете власні дані свіжості, які стабільно перевершують загальні оцінки спільноти."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 18 — Max Attempts & Cost Estimator
// ═══════════════════════════════════════════════════════════════
function Slide18({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🎯" text={L(lang, "Max Attempts & Cost Estimator", "Макс. спроб та оцінка вартості")} color={ACCENT} />

      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.55 }}>
        {L(lang,
          "The «Max Number Attempts» field controls how many SMSPool numbers the factory will purchase and try before giving up on one account slot. The cost estimator shows your projected spend before you launch.",
          "Поле «Макс. спроб номерів» контролює скільки номерів SMSPool фабрика купить і спробує перед тим як відмовитися від одного слоту акаунта. Оцінювач вартості показує прогнозовані витрати до запуску."
        )}
      </div>

      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, fontWeight:800, color:ACCENT, marginBottom:10 }}>
          {L(lang, "Max Number Attempts field", "Поле «Макс. спроб номерів»")}
        </div>
        {[
          [L(lang,"Range","Діапазон"),        L(lang,"1 – 999 (default: 20)","1 – 999 (за замовчуванням: 20)")],
          [L(lang,"Glow warning","Помаранчеве світіння"), L(lang,"Input border glows orange when value > 20 — signals aggressive spend","Рамка поля світиться помаранчевим при значенні > 20 — сигнал агресивних витрат")],
          [L(lang,"Per-account limit","Ліміт на акаунт"), L(lang,"Each account in a batch gets its own full maxAttempts budget","Кожен акаунт у пакеті отримує власний повний бюджет maxAttempts")],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:ACCENT, minWidth:110 }}>{k as string}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.4 }}>{v as string}</div>
          </div>
        ))}
      </div>

      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, fontWeight:800, color:ACCENT, marginBottom:8 }}>
          💰 {L(lang, "Cost Estimator Banner", "Банер оцінки вартості")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.6, marginBottom:10 }}>
          {L(lang,
            "Displayed below the Max Attempts field, the estimator calculates in real time:",
            "Відображається нижче поля Макс. спроб, оцінювач розраховує в реальному часі:"
          )}
        </div>
        <code style={{ display:"block", fontSize:11, color:ACCENT, background:`${ACCENT}12`, border:`1px solid ${ACCENT}33`,
          borderRadius:9, padding:"10px 13px", fontFamily:"monospace", marginBottom:10, lineHeight:1.8 }}>
          {L(lang,
            "estCost = maxAttempts × price × quantity",
            "estCost = maxAttempts × ціна × кількість"
          )}
        </code>
        {[
          ["🟢", "#2de897", L(lang,"Within budget","В рамках бюджету"),  L(lang,"estCost ≤ SMSPool balance — green card, safe to launch","estCost ≤ баланс SMSPool — зелена картка, безпечно запускати")],
          ["🔴", "#ff6b7a", L(lang,"Over budget","Перевищення бюджету"), L(lang,"estCost > SMSPool balance — red card with ⚠ warning, factory will stall mid-batch without topping up","estCost > баланс SMSPool — червона картка з ⚠, фабрика зупиниться в середині пакету без поповнення")],
        ].map(([em, c, t, d]) => (
          <div key={t as string} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>{em as string}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:c as string, marginBottom:2 }}>{t as string}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", lineHeight:1.4 }}>{d as string}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card(PURPLE), marginTop:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:PURPLE, marginBottom:6 }}>
          💡 {L(lang, "Strategy tip", "Порада")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.55 }}>
          {L(lang,
            "Keep maxAttempts at 5–10 for high-freshness countries (Cambodia, Laos). Raise to 20–50 only for countries with known recycling issues. The AI Country Picker freshness score is your best guide.",
            "Тримайте maxAttempts 5–10 для країн з високою свіжістю (Камбоджа, Лаос). Підвищуйте до 20–50 лише для країн із відомими проблемами повторних номерів. Оцінка свіжості AI-підбору країни — ваш найкращий орієнтир."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE REGISTRY + MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6, Slide7, Slide8, Slide9, Slide10, Slide11, Slide12, Slide13, Slide14, Slide15, Slide16, Slide17, Slide18];
const TITLES_EN = ["Cover","What is it?","Prerequisites","SMSPool API","Decodo Proxy","API Credentials","8-Step Pipeline","Country Selection","Batch Mode","Sessions & Files","Error Handling","Warmup Modes","Best Practices","Proxy Store & Sessions","AI Country Picker","Session Stats Strip","AI Feedback Loop","Max Attempts & Cost Estimator"];
const TITLES_UA = ["Обкладинка","Що це?","Передумови","SMSPool API","Decodo Проксі","API Credentials","8-кроковий конвеєр","Вибір країни","Пакетний режим","Сесії та файли","Обробка помилок","Режими прогріву","Найкращі практики","Сховище проксі та сесії","AI-вибір країни","Стрічка статистики","AI зворотній зв'язок","Макс. спроб та оцінка вартості"];
const KEYWORDS_EN = ["","automated registration telethon smspool proxy","prerequisites smspool decodo credentials","smspool api key purchase number service","decodo smartproxy socks5 residential mobile","telegram api id hash my.telegram.org","pipeline steps 8 telethon sign profile avatar","country cambodia laos myanmar kazakhstan ukraine freshness ranking","batch mode quantity multiple accounts 20","session json metadata file storage","error ban timeout proxy network","warmup mode none all ask per account popup 48h","best practices warmup validate proxy rotate","proxy store save autofill session number increment continue last_session_num delete country","ai picker country freshness avg attempts ranking gemini data source badge community own estimate","session stats money spent counter dollar recycled skips current country total","ai feedback loop report freshness recycled fresh button badge factory_country_stats own data community 🔬 📊","max attempts cost estimator budget balance smspool price quantity orange glow red over budget green within"];
const KEYWORDS_UA = ["","автоматична реєстрація телетон смспул проксі","передумови смспул декодо credentials","смспул апі ключ купівля номер сервіс","декодо смартпроксі socks5 residential mobile","телеграм апі id hash my.telegram.org","конвеєр кроки 8 телетон вхід профіль аватар","країна камбоджа лаос м'янма казахстан україна свіжість рейтинг","пакетний режим кількість кілька акаунтів 20","сесія json метадані файл зберігання","помилка бан таймаут проксі мережа","режим прогріву без прогріву всі питати попап 48год","найкращі практики прогрів перевірка ротація","сховище проксі зберегти автозаповнення номер сесії інкремент продовжити last_session_num видалити країна","ai вибір країна свіжість середні спроби рейтинг gemini джерело даних спільнота наші оцінка","стрічка статистики гроші витрачено лічильник долар переробл. поточна країна всього","ai зворотній звязок звіт свіжість переробл. свіжі кнопка значок factory_country_stats наші дані спільнота 🔬 📊","макс спроб оцінка вартості бюджет баланс смспул ціна кількість помаранчевий червоний перевищення зелений"];

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
