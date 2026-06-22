import { useState, useRef, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";

interface Props { onClose: () => void }
type SL = { lang: Lang };

const TEAL   = "#2dd4bf";
const PURPLE = "#a855f7";
const AMBER  = "#f59e0b";
const GREEN  = "#10d88a";
const BLUE   = "#3b82f6";
const RED    = "#ff6b7a";
const PINK   = "#f472b6";
const BG     = "#07090f";
const GLASS  = "rgba(255,255,255,0.055)";
const GLASS2 = "rgba(255,255,255,0.09)";
const BORDER = "rgba(255,255,255,0.10)";
const BORDER2= "rgba(255,255,255,0.16)";

const L = (lang: Lang, en: string, ua: string) => lang === "ua" ? ua : en;

const card = (accent = TEAL): React.CSSProperties => ({
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

function STitle({ icon, text, color = TEAL }: { icon: string; text: string; color?: string }) {
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
  return (
    <Shell>
      <div style={{ textAlign:"center", paddingTop:24, paddingBottom:20 }}>
        <div style={{ width:88, height:88, borderRadius:28, margin:"0 auto 20px",
          background:`linear-gradient(135deg,${TEAL}33,${PURPLE}22)`,
          border:`2px solid ${TEAL}55`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:44,
          boxShadow:`0 0 40px ${TEAL}28` }}>🛡️</div>
        <div style={{ fontSize:24, fontWeight:900, color:"#fff", letterSpacing:-0.5, marginBottom:8 }}>
          {L(lang,"Verification Hub","Центр верифікації")}
        </div>
        <div style={{ fontSize:13, color:`${TEAL}cc`, fontWeight:700, marginBottom:18, letterSpacing:"0.05em" }}>
          {L(lang,"HUMAN-IN-THE-LOOP CAPTCHA SYSTEM","СИСТЕМА CAPTCHA ОПЕРАТОРА")}
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", lineHeight:1.65, maxWidth:320, margin:"0 auto" }}>
          {L(lang,
            "When Telegram anti-bot guards block your accounts after joining groups, the Verification Hub lets you solve the captchas manually — without leaving the Mini App.",
            "Коли антибот-захист Telegram блокує акаунти після вступу до груп, Центр верифікації дозволяє вирішувати капчі вручну — не виходячи з Mini App."
          )}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:10 }}>
        {[
          [TEAL,   "🔘", L(lang,"Button captchas — tap inline keyboard buttons","Кнопкові капчі — натискання inline-кнопок")],
          [BLUE,   "✏️", L(lang,"Text captchas — answer math & logic questions","Текстові капчі — відповіді на запитання")],
          [PURPLE, "🔄", L(lang,"4-second auto-poll — new challenges appear instantly","Авто-опитування кожні 4 с — нові виклики з'являються миттєво")],
          [AMBER,  "⚡", L(lang,"One-click solve — operator stays in full control","Вирішення одним кліком — оператор у повному контролі")],
        ].map(([c,icon,txt]) => (
          <div key={txt as string} style={{ background:`${c as string}10`, border:`1px solid ${c as string}30`,
            borderRadius:12, padding:"10px 14px", display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:18 }}>{icon as string}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.72)", lineHeight:1.45 }}>{txt as string}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — Why captchas happen
// ═══════════════════════════════════════════════════════════════
function Slide2({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🤖" text={L(lang,"Why Captchas Happen","Чому виникають капчі")} color={RED} />
      <div style={{ ...card(RED), marginBottom:14 }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65 }}>
          {L(lang,
            "When an account joins many groups in a short time, Telegram's anti-bot system triggers a challenge. The account receives a message from a bot with either a keyboard button to tap or a question to answer. Until the challenge is solved, the account cannot post in that group.",
            "Коли акаунт вступає до багатьох груп за короткий час, антибот-система Telegram активує перевірку. Акаунт отримує повідомлення від бота з кнопкою або запитанням. Поки перевірка не пройдена, акаунт не може відправляти повідомлення в цю групу."
          )}
        </div>
      </div>
      <Row icon="🔗" color={AMBER} label={L(lang,"Join velocity","Швидкість вступу")}
        desc={L(lang,"Joining >5 groups/min consistently triggers captcha challenges","Вступ до >5 груп/хв стабільно викликає капчу")} />
      <Row icon="📱" color={BLUE} label={L(lang,"Account age","Вік акаунта")}
        desc={L(lang,"Newer accounts get challenged more aggressively than aged ones","Нові акаунти отримують виклики частіше, ніж старі")} />
      <Row icon="🌐" color={PURPLE} label={L(lang,"Proxy origin","Походження проксі")}
        desc={L(lang,"Datacenter IPs increase captcha frequency vs. residential/mobile","Датацентрові IP збільшують частоту капч порівняно з резидентними")} />
      <Row icon="🔁" color={GREEN} label={L(lang,"Session health","Здоров'я сесії")}
        desc={L(lang,"Fresh or recently re-authorised accounts are challenged more often","Свіжі або нещодавно переавторизовані акаунти перевіряються частіше")} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — Architecture overview
// ═══════════════════════════════════════════════════════════════
function Slide3({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🏗️" text={L(lang,"System Architecture","Архітектура системи")} color={TEAL} />
      <div style={{ ...card(TEAL), marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:TEAL, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>
          {L(lang,"4-Layer Pipeline","4-рівнева система")}
        </div>
        {[
          ["1", TEAL,   L(lang,"Telethon Listener","Telethon-слухач"),
            L(lang,"Persistent MTProto connection per account. Monitors NewMessage events.","Постійне MTProto-з'єднання на акаунт. Відстежує події NewMessage.")],
          ["2", BLUE,   L(lang,"Captcha Detector","Детектор капч"),
            L(lang,"Heuristic checks: has inline buttons OR text matches captcha keywords.","Евристика: є inline-кнопки АБО текст містить ключові слова капчі.")],
          ["3", AMBER,  L(lang,"SQLite Queue","Черга SQLite"),
            L(lang,"pending_verifications table stores unresolved challenges. Status: pending → solved/dismissed.","Таблиця pending_verifications зберігає невирішені виклики. Статус: pending → solved/dismissed.")],
          ["4", GREEN,  L(lang,"Operator UI","Інтерфейс оператора"),
            L(lang,"Verification Hub tab polls /api/verifications/pending every 4s. One-click resolve.","Вкладка Captcha опитує /api/verifications/pending кожні 4 с. Вирішення одним кліком.")],
        ].map(([n,c,t,d]) => (
          <Step key={t as string} n={Number(n)} color={c as string} title={t as string} desc={d as string} />
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — DB table schema
// ═══════════════════════════════════════════════════════════════
function Slide4({ lang }: SL) {
  const cols = [
    ["id",             "INTEGER PK",         L(lang,"Auto-increment row ID","ID рядка")],
    ["account_id",     "INTEGER",            L(lang,"Sender account that received the challenge","Акаунт, що отримав виклик")],
    ["group_username", "TEXT",               L(lang,"Telegram group @username or empty","@username групи або порожньо")],
    ["group_title",    "TEXT",               L(lang,"Human-readable group name","Назва групи")],
    ["bot_message_id", "INTEGER",            L(lang,"Message ID needed to click/reply","ID повідомлення для кліку/відповіді")],
    ["captcha_text",   "TEXT",               L(lang,"Captcha challenge text (≤800 chars)","Текст виклику (≤800 символів)")],
    ["buttons_json",   "TEXT JSON",          L(lang,"Serialised inline keyboard rows[][]","Серіалізовані рядки inline-клавіатури[][]")],
    ["captcha_type",   "button|text_reply",  L(lang,"Challenge type","Тип виклику")],
    ["status",         "pending|solved|…",   L(lang,"Current resolution state","Поточний стан вирішення")],
    ["created_at",     "TEXT ISO-8601",       L(lang,"Timestamp of detection","Час виявлення")],
  ];
  return (
    <Shell>
      <STitle icon="🗄️" text={L(lang,"pending_verifications Table","Таблиця pending_verifications")} color={PURPLE} />
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:10 }}>
        {L(lang,"DB migration Step 9 — auto-created on startup","DB-міграція Крок 9 — авто-створення при старті")}
      </div>
      {cols.map(([col,type,desc]) => (
        <div key={col} style={{ ...card(PURPLE), padding:"9px 13px", marginBottom:7 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:PURPLE, fontFamily:"monospace" }}>{col}</div>
            <div style={{ fontSize:9, color:`${AMBER}aa`, background:`${AMBER}15`, borderRadius:5, padding:"1px 6px", whiteSpace:"nowrap" }}>{type}</div>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", marginTop:3 }}>{desc}</div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — The Telethon Listener
// ═══════════════════════════════════════════════════════════════
function Slide5({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="📡" text={L(lang,"The Telethon Listener","Telethon-слухач")} color={BLUE} />
      <div style={{ ...card(BLUE) }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:12 }}>
          {L(lang,
            "verification_listener.py maintains one persistent TelegramClient per account. It subscribes to events.NewMessage(incoming=True) and checks each message for captcha signatures.",
            "verification_listener.py підтримує один постійний TelegramClient на акаунт. Він підписується на events.NewMessage(incoming=True) і перевіряє кожне повідомлення на ознаки капчі."
          )}
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:BLUE, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>
          {L(lang,"Captcha Detection Rules","Правила виявлення капч")}
        </div>
        <Row icon="🔘" color={TEAL} label={L(lang,"Button captcha","Кнопкова капча")}
          desc={L(lang,"Message has reply_markup (inline keyboard) AND non-empty text","Повідомлення має reply_markup (inline-клавіатуру) І непорожній текст")} />
        <Row icon="✏️" color={AMBER} label={L(lang,"Text captcha","Текстова капча")}
          desc={L(lang,"No buttons but text contains captcha keywords (EN + RU/UA)","Немає кнопок, але текст містить ключові слова капчі (EN + RU/UA)")} />
        <Row icon="⚡" color={PURPLE} label={L(lang,"Auto-start","Авто-запуск")}
          desc={L(lang,"POST /api/verifications/listeners/start-all starts listeners for all idle/active accounts","POST /api/verifications/listeners/start-all запускає слухачів для всіх активних акаунтів")} />
      </div>
      <div style={{ ...card(RED), marginTop:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:RED, marginBottom:5 }}>
          ⚠️ {L(lang,"Important","Важливо")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "Listeners must be restarted after a supervisor/API restart. They are NOT auto-started on boot — press 'Start All' in the Verification Hub to activate.",
            "Слухачів потрібно перезапускати після рестарту supervisor/API. Вони НЕ запускаються автоматично при старті — натисніть 'Запустити всі' у Центрі верифікації."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — Hub UI walkthrough
// ═══════════════════════════════════════════════════════════════
function Slide6({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🖥️" text={L(lang,"Hub UI Walkthrough","Інтерфейс хабу")} color={TEAL} />
      <Step n={1} color={TEAL} title={L(lang,"Navigate to Verify tab","Відкрийте вкладку Captcha")}
        desc={L(lang,"Tap the 🛡️ teal shield icon in the bottom nav bar","Натисніть на іконку 🛡️ у нижній панелі навігації")} />
      <Step n={2} color={BLUE} title={L(lang,"Start All listeners","Запустіть всі слухачі")}
        desc={L(lang,"Press 'Start All' in the Captcha Listener control card — connects all idle/active accounts","Натисніть 'Запустити всі' у картці Captcha Listener — підключає всі активні акаунти")} />
      <Step n={3} color={PURPLE} title={L(lang,"Wait for challenges","Очікуйте виклики")}
        desc={L(lang,"The Hub polls every 4 seconds. New captcha cards appear automatically","Хаб опитує кожні 4 секунди. Нові капча-картки з'являються автоматично")} />
      <Step n={4} color={AMBER} title={L(lang,"Solve the challenge","Вирішіть виклик")}
        desc={L(lang,"For buttons: tap the correct button. For text: type the answer and press Send","Для кнопок: натисніть правильну кнопку. Для тексту: введіть відповідь і натисніть Надіслати")} />
      <Step n={5} color={GREEN} title={L(lang,"Card disappears","Картка зникає")}
        desc={L(lang,"After a successful solve the card animates out and the account can post normally","Після успішного вирішення картка зникає і акаунт може відправляти повідомлення")} />
      <div style={{ ...card(TEAL), marginTop:4 }}>
        <div style={{ fontSize:11, fontWeight:700, color:TEAL, marginBottom:5 }}>
          🛡️ {L(lang,"All Clear State","Стан All Clear")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "When no pending captchas exist a pulsing green shield is shown. The background poll continues running every 4 seconds.",
            "Якщо немає активних капч, відображається мигаючий зелений щит. Фоновий опит продовжується кожні 4 секунди."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — Button captchas in detail
// ═══════════════════════════════════════════════════════════════
function Slide7({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔘" text={L(lang,"Button Captchas","Кнопкові капчі")} color={PURPLE} />
      <div style={{ ...card(PURPLE) }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:12 }}>
          {L(lang,
            "The most common anti-bot challenge: the bot sends a message with 1-4 inline keyboard buttons. Usually one says 'I am not a robot' or shows a green checkmark. You must tap the correct one.",
            "Найпоширеніший антибот-виклик: бот надсилає повідомлення з 1-4 inline-кнопками. Зазвичай одна каже 'Я не робот' або показує галочку. Ви маєте натиснути правильну."
          )}
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:PURPLE, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
          {L(lang,"How it works under the hood","Як це працює зсередини")}
        </div>
        <Row icon="💾" color={TEAL} label={L(lang,"Buttons stored as JSON","Кнопки збережені як JSON")}
          desc={L(lang,"Each row of buttons is stored as [[{text, callback_data}, …], …]","Кожен рядок кнопок зберігається як [[{text, callback_data}, …], …]")} />
        <Row icon="🔢" color={AMBER} label={L(lang,"Flat index sent to API","Плоский індекс відправляється до API")}
          desc={L(lang,"POST /api/verifications/click with button_index (0-based, left-to-right, top-to-bottom)","POST /api/verifications/click з button_index (починаючи з 0, зліва направо, зверху вниз)")} />
        <Row icon="⚙️" color={BLUE} label={L(lang,"Telethon clicks it for you","Telethon клікає за вас")}
          desc={L(lang,"The API creates a Telethon client for that account and calls message.click(index)","API створює Telethon-клієнт для цього акаунта і викликає message.click(index)")} />
      </div>
      <div style={{ ...card(GREEN), marginTop:0 }}>
        <div style={{ fontSize:11, fontWeight:700, color:GREEN, marginBottom:5 }}>
          ✅ {L(lang,"Typical button layouts","Типові типи кнопок")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.6 }}>
          {L(lang,
            "✓ «I am not a robot»  ✓ «Verify me»  ✓ Green checkmark emoji\n✓ Math answer (e.g. «3» «7» «12» — choose the right sum)",
            "✓ «Я не робот»  ✓ «Підтвердити»  ✓ Зелена галочка\n✓ Відповідь на математику (напр. «3» «7» «12» — вибрати правильну суму)"
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — Text-reply captchas
// ═══════════════════════════════════════════════════════════════
function Slide8({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="✏️" text={L(lang,"Text Reply Captchas","Текстові капчі")} color={BLUE} />
      <div style={{ ...card(BLUE) }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:12 }}>
          {L(lang,
            "Some groups use text-based challenges: the bot asks a math question, a word association, or a secret keyword. You type your answer in the text field and send it as a reply to the bot's message.",
            "Деякі групи використовують текстові завдання: бот запитує математику, асоціацію чи секретне слово. Ви вводите відповідь у текстове поле і відправляєте як відповідь на повідомлення бота."
          )}
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:BLUE, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
          {L(lang,"API Flow","Процес API")}
        </div>
        <Step n={1} color={TEAL}
          title={L(lang,"You type the answer","Ви вводите відповідь")}
          desc={L(lang,"In the text field under the captcha card in the Hub UI","У текстовому полі під карткою капчі в інтерфейсі Хабу")} />
        <Step n={2} color={PURPLE}
          title={L(lang,"POST /api/verifications/reply","POST /api/verifications/reply")}
          desc={L(lang,"Sends {verification_id, answer} to the Python FastAPI","Відправляє {verification_id, answer} до Python FastAPI")} />
        <Step n={3} color={AMBER}
          title={L(lang,"Telethon sends reply","Telethon відправляє відповідь")}
          desc={L(lang,"client.send_message(group, answer, reply_to=bot_message_id)","client.send_message(group, answer, reply_to=bot_message_id)")} />
        <Step n={4} color={GREEN}
          title={L(lang,"Status → solved","Статус → solved")}
          desc={L(lang,"Row marked solved, card removed from UI","Рядок позначається як solved, картка прибирається з інтерфейсу")} />
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — API reference
// ═══════════════════════════════════════════════════════════════
function Slide9({ lang }: SL) {
  const endpoints = [
    ["GET",  "/api/verifications/pending",           "pending|solved|dismissed", L(lang,"List challenges by status","Список викликів за статусом")],
    ["POST", "/api/verifications/click",             "{verification_id, button_index}", L(lang,"Click an inline keyboard button","Клікнути inline-кнопку")],
    ["POST", "/api/verifications/reply",             "{verification_id, answer}", L(lang,"Send text answer to bot","Відправити текстову відповідь боту")],
    ["POST", "/api/verifications/resolve/{id}",      "?action=dismissed|solved", L(lang,"Mark without action","Позначити без дії")],
    ["POST", "/api/verifications/listeners/start",   "{account_id}", L(lang,"Start listener for one account","Запустити слухач для одного акаунта")],
    ["POST", "/api/verifications/listeners/stop",    "{account_id}", L(lang,"Stop listener for one account","Зупинити слухач для одного акаунта")],
    ["POST", "/api/verifications/listeners/start-all","—", L(lang,"Start listeners for all active accounts","Запустити слухачі для всіх активних акаунтів")],
    ["GET",  "/api/verifications/listeners",         "—", L(lang,"List active listener account IDs","Список акаунтів з активними слухачами")],
  ];
  return (
    <Shell>
      <STitle icon="📡" text={L(lang,"API Reference","Довідник API")} color={TEAL} />
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:10 }}>
        {L(lang,"Python FastAPI · port 8083 · proxied via /api","Python FastAPI · порт 8083 · проксується через /api")}
      </div>
      {endpoints.map(([m,p,body,desc]) => (
        <div key={p as string} style={{ ...card(TEAL), padding:"9px 13px", marginBottom:7 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:3 }}>
            <div style={{ fontSize:9, fontWeight:800, color: m === "GET" ? GREEN : AMBER,
              background: m === "GET" ? `${GREEN}18` : `${AMBER}18`,
              border:`1px solid ${m === "GET" ? GREEN : AMBER}44`,
              borderRadius:5, padding:"1px 6px", flexShrink:0 }}>{m as string}</div>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.8)", fontFamily:"monospace", wordBreak:"break-all" }}>{p as string}</div>
          </div>
          <div style={{ fontSize:10, color:`${TEAL}99`, fontFamily:"monospace", marginBottom:3 }}>{body as string}</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{desc as string}</div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — Bulk Join + Verify workflow
// ═══════════════════════════════════════════════════════════════
function Slide10({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🚀" text={L(lang,"Bulk Join + Verify Workflow","Масовий вступ + верифікація")} color={AMBER} />
      <div style={{ ...card(AMBER), marginBottom:14 }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:10 }}>
          {L(lang,
            "The recommended flow when onboarding a new batch of accounts into groups:",
            "Рекомендований процес при масовому вступі нових акаунтів до груп:"
          )}
        </div>
        <Step n={1} color={TEAL}
          title={L(lang,"Start captcha listeners","Запустіть слухачі капч")}
          desc={L(lang,"Tap 'Start All' in the Verification Hub before initiating any bulk join","Натисніть 'Запустити всі' у Центрі верифікації перед будь-яким масовим вступом")} />
        <Step n={2} color={PURPLE}
          title={L(lang,"Launch the group broadcast","Запустіть групову розсилку")}
          desc={L(lang,"Use Groups tab to start a broadcast — accounts begin joining the target groups","Використовуйте вкладку Групи для запуску розсилки — акаунти починають вступати до цільових груп")} />
        <Step n={3} color={AMBER}
          title={L(lang,"Monitor the Verify tab","Стежте за вкладкою Captcha")}
          desc={L(lang,"Keep the Verification Hub open. Captcha cards appear as each account hits a gate","Тримайте Центр верифікації відкритим. Картки капч з'являються, коли акаунти натрапляють на перевірку")} />
        <Step n={4} color={BLUE}
          title={L(lang,"Solve challenges as they arrive","Вирішуйте виклики у міру надходження")}
          desc={L(lang,"Click the button or type the answer. The account immediately resumes broadcasting","Клікніть кнопку або введіть відповідь. Акаунт одразу відновлює розсилку")} />
        <Step n={5} color={GREEN}
          title={L(lang,"Wait for All Clear","Дочекайтесь All Clear")}
          desc={L(lang,"Once the Hub shows 🛡️ All Clear all accounts have passed verification","Коли Хаб показує 🛡️ Все чисто — всі акаунти пройшли верифікацію")} />
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — Best practices
// ═══════════════════════════════════════════════════════════════
function Slide11({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="💡" text={L(lang,"Best Practices","Поради та рекомендації")} color={GREEN} />
      <Row icon="⏱️" color={TEAL} label={L(lang,"Pace your joins","Регулюйте швидкість вступу")}
        desc={L(lang,"Join no more than 2-3 groups/min per account to reduce captcha frequency","Вступайте не більше ніж до 2-3 груп/хв на акаунт для зниження частоти капч")} />
      <Row icon="🌐" color={BLUE} label={L(lang,"Residential proxies","Резидентні проксі")}
        desc={L(lang,"Mobile/residential SOCKS5 proxies trigger far fewer captchas than datacenter IPs","Мобільні/резидентні SOCKS5-проксі викликають набагато менше капч, ніж датацентрові IP")} />
      <Row icon="📅" color={AMBER} label={L(lang,"Aged accounts","Старі акаунти")}
        desc={L(lang,"Accounts older than 30 days with phone activity pass captchas more reliably","Акаунти старше 30 днів з активністю телефону проходять капчі надійніше")} />
      <Row icon="👀" color={PURPLE} label={L(lang,"Keep Hub visible","Тримайте Хаб відкритим")}
        desc={L(lang,"During bulk operations leave the Verify tab open to catch challenges instantly","Під час масових операцій тримайте вкладку Captcha відкритою для миттєвого реагування")} />
      <Row icon="🔄" color={GREEN} label={L(lang,"Restart listeners after API restart","Перезапускайте слухачі після рестарту API")}
        desc={L(lang,"Listener state is in-memory. Click 'Start All' again after any API/supervisor restart","Стан слухача — в пам'яті. Натисніть 'Запустити всі' після кожного рестарту API/supervisor")} />
      <Row icon="🗑️" color={RED} label={L(lang,"Dismiss stale captchas","Відхиляйте застарілі капчі")}
        desc={L(lang,"Captchas older than 5-10 min are likely expired. Hit Dismiss to clear the queue","Капчі старше 5-10 хв, ймовірно, прострочені. Натисніть Відхилити для очищення черги")} />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — FAQ
// ═══════════════════════════════════════════════════════════════
function Slide12({ lang }: SL) {
  const faqs = [
    [
      L(lang,"What if the captcha button click fails?","Що якщо клік по кнопці не вдається?"),
      L(lang,"The message may have expired. Dismiss it and wait for a new challenge — the bot usually resends after 30-60s.","Повідомлення могло застаріти. Відхиліть його і дочекайтесь нового — бот зазвичай повторно надсилає через 30-60 с."),
    ],
    [
      L(lang,"The group has no username — will click still work?","Група не має username — чи спрацює клік?"),
      L(lang,"Yes. The API uses the raw peer ID internally. The group_username field may be empty but the action still succeeds.","Так. API використовує raw peer ID всередині. Поле group_username може бути порожнім, але дія все одно виконується."),
    ],
    [
      L(lang,"I started 'Start All' but the listener list is empty?","Натиснув 'Запустити всі', але список слухачів порожній?"),
      L(lang,"Check that the accounts have valid .session files and are in idle/active status. Listeners are skipped for banned/flood_wait accounts.","Перевірте, що акаунти мають дійсні .session-файли і перебувають у статусі idle/active. Слухачі пропускаються для banned/flood_wait акаунтів."),
    ],
    [
      L(lang,"Can I auto-solve captchas without the Hub?","Чи можна вирішувати капчі автоматично без Хабу?"),
      L(lang,"Not yet. Auto-solving would require an OCR/AI service. The HITL (Human-in-the-Loop) approach is intentional for reliability.","Поки що ні. Авторозпізнавання потребує OCR/AI-сервісу. Підхід HITL (оператор у петлі) обраний навмисно для надійності."),
    ],
    [
      L(lang,"Do dismissed captchas disappear forever?","Відхилені капчі зникають назавжди?"),
      L(lang,"They are marked 'dismissed' in the DB. Use GET /api/verifications/pending?status=dismissed to review them.","Вони позначаються 'dismissed' у БД. Використовуйте GET /api/verifications/pending?status=dismissed для перегляду."),
    ],
  ];
  return (
    <Shell>
      <STitle icon="❓" text={L(lang,"FAQ","Часті запитання")} color={AMBER} />
      {faqs.map(([q, a], i) => (
        <div key={i} style={{ ...card(AMBER), padding:"12px 14px", marginBottom:9 }}>
          <div style={{ fontSize:12, fontWeight:700, color:AMBER, marginBottom:5, lineHeight:1.4 }}>
            Q: {q}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.55 }}>
            {a}
          </div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — Push Alerts
// ═══════════════════════════════════════════════════════════════
function Slide13({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🔔" text={L(lang,"Push Alerts","Push-сповіщення")} color={AMBER} />
      <div style={{ ...card(AMBER), marginBottom:12 }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:10 }}>
          {L(lang,
            "When a new captcha challenge is detected, the system can instantly notify you via a Telegram bot message — so you don't need to keep the Hub tab open. Solved captchas are handled without leaving your chat.",
            "Коли виявляється новий капча-виклик, система може миттєво сповістити вас через повідомлення Telegram-бота — вам не потрібно тримати вкладку Хабу відкритою. Капчі вирішуються без виходу з чату."
          )}
        </div>
        <div style={{ background:`${AMBER}12`, border:`1px solid ${AMBER}30`, borderRadius:12,
          padding:"12px 14px", fontFamily:"monospace", fontSize:11, lineHeight:1.7,
          color:"rgba(255,255,255,0.75)", wordBreak:"break-word", overflowX:"hidden" }}>
          🛡️ <strong style={{ color:AMBER }}>Captcha Alert</strong><br />
          Account: <span style={{ color:TEAL }}>`+38099…`</span><br />
          Group: SomeGroup<br />
          Type: 🔘 Button<br />
          🔗 your-app.replit.app<br /><br />
          <span style={{ color:"rgba(255,255,255,0.45)" }}>{L(lang,"Open the Verification Hub in PROMO-Fuel to solve.","Відкрийте Центр верифікації у PROMO-Fuel для вирішення.")}</span>
        </div>
      </div>

      <div style={{ fontSize:11, fontWeight:700, color:TEAL, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:10 }}>
        {L(lang,"Setup — 2 required env vars","Налаштування — 2 обов'язкові змінні середовища")}
      </div>

      <Row icon="🤖" color={GREEN} label="TELEGRAM_TOKEN"
        desc={L(lang,"Your Telegram bot token (same one used for the main bot)","Токен вашого Telegram-бота (той самий, що для основного бота)")} />
      <Row icon="👤" color={BLUE} label="ADMIN_TELEGRAM_ID"
        desc={L(lang,"Your personal Telegram user ID — alerts go here (use @userinfobot to find it)","Ваш особистий Telegram user ID — сповіщення надходять сюди (знайдіть через @userinfobot)")} />
      <Row icon="🔗" color={PURPLE} label="MINIAPP_URL (optional)"
        desc={L(lang,"Your deployed Mini App URL — added as a one-tap deep-link in every alert","URL вашого розгорнутого Mini App — додається як кнопка в кожне сповіщення")} />

      <div style={{ ...card(RED), marginTop:4, marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:RED, marginBottom:5 }}>
          ⚡ {L(lang,"Rate limiting","Обмеження частоти")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.55 }}>
          {L(lang,
            "Maximum one alert per account per 60 seconds — prevents flooding when many captchas arrive at once. The Hub UI still shows all challenges in real time.",
            "Максимум одне сповіщення на акаунт на 60 секунд — запобігає спаму, коли багато капч надходить одночасно. Інтерфейс Хабу все одно показує всі виклики в реальному часі."
          )}
        </div>
      </div>

      <div style={{ background:`${TEAL}10`, border:`1px solid ${TEAL}30`, borderRadius:14, padding:"12px 14px" }}>
        <div style={{ fontSize:11, fontWeight:800, color:TEAL, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
          <span>🤖</span>
          {L(lang,"/captcha Bot Command","Команда /captcha бота")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.55, marginBottom:8 }}>
          {L(lang,
            "When MINIAPP_URL is set, send /captcha in your bot chat. It replies with the pending count plus a one-tap 🛡️ button that opens the Verification Hub directly — no navigation needed.",
            "Якщо MINIAPP_URL встановлено, відправте /captcha у чаті бота. Бот відповість з кількістю очікуючих капч і кнопкою 🛡️, яка одразу відкриє Центр верифікації — без зайвих кроків."
          )}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <div style={{ background:`${TEAL}18`, border:`1px solid ${TEAL}35`, borderRadius:9,
            padding:"4px 10px", fontSize:10, fontWeight:700, color:TEAL, fontFamily:"monospace" }}>
            /captcha
          </div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", alignSelf:"center" }}>
            {L(lang,"→ shows pending count + WebApp button","→ показує кількість + кнопку WebApp")}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════

const KEYWORDS_VERIF: string[] = [
  "cover intro verification hub captcha HITL",
  "why captcha reason join groups anti-bot trigger",
  "architecture system pipeline listener DB queue",
  "schema database table columns pending_verifications",
  "telethon listener connection events NewMessage detection",
  "UI walkthrough navigate tab start listeners solve",
  "button captchas inline keyboard click index",
  "text reply captchas math question answer send",
  "API endpoints reference click reply resolve listener",
  "bulk join workflow broadcast groups sequence steps",
  "best practices tips residential proxy aged accounts",
  "FAQ questions answers troubleshoot dismiss stale auto-solve",
  "push alerts notifications telegram bot token admin ID MINIAPP_URL rate limit /captcha command deep link",
];

const SLIDES_V: Array<(p: SL) => React.ReactElement> = [
  Slide1,Slide2,Slide3,Slide4,Slide5,Slide6,
  Slide7,Slide8,Slide9,Slide10,Slide11,Slide12,Slide13,
];
const TOTAL_V = SLIDES_V.length;

const TITLES_V: Record<Lang, string[]> = {
  en: [
    "Cover","Why Captchas Happen","Architecture","DB Table Schema",
    "Telethon Listener","Hub UI Walkthrough","Button Captchas","Text Reply Captchas",
    "API Reference","Bulk Join + Verify Workflow","Best Practices","FAQ",
    "Push Alerts",
  ],
  ua: [
    "Обкладинка","Чому виникають капчі","Архітектура","Схема таблиці БД",
    "Telethon-слухач","Огляд інтерфейсу","Кнопкові капчі","Текстові капчі",
    "Довідник API","Масовий вступ + верифікація","Поради","Часті запитання",
    "Push-сповіщення",
  ],
};

// ═══════════════════════════════════════════════════════════════
// ManualVerificationPage shell
// ═══════════════════════════════════════════════════════════════
export function ManualVerificationPage({ onClose }: Props) {
  const { lang } = useI18n();
  const [current, setCurrent]     = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const touchX = useRef(0);
  const touchY = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const accentColor = TEAL;

  const next = useCallback(() => setCurrent(c => Math.min(c + 1, TOTAL_V - 1)), []);
  const prev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  function toggleSearch() {
    setShowSearch(s => {
      if (!s) setTimeout(() => searchRef.current?.focus(), 80);
      else { setSearchQuery(""); }
      return !s;
    });
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

  const SlideComp = SLIDES_V[current]!;
  const titles = TITLES_V[lang];

  const q = searchQuery.toLowerCase().trim();
  const searchResults: Array<{ index: number; title: string }> = q.length < 1 ? [] :
    titles.flatMap((title, i) => {
      const haystack = `${title} ${KEYWORDS_VERIF[i] ?? ""}`.toLowerCase();
      return haystack.includes(q) ? [{ index: i, title }] : [];
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
              <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)", letterSpacing:-0.2 }}>
                {titles[current]}
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:1 }}>
                {current + 1} / {TOTAL_V}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={toggleSearch} style={{ background:showSearch?`${TEAL}22`:GLASS2,
              border:`1px solid ${showSearch?TEAL:BORDER2}`, borderRadius:10, width:33, height:33,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:showSearch?TEAL:"rgba(255,255,255,0.55)", fontSize:15, cursor:"pointer" }}>
              🔍
            </button>
            <button onClick={onClose} style={{ background:GLASS2, border:`1px solid ${BORDER2}`,
              borderRadius:10, width:33, height:33, display:"flex", alignItems:"center",
              justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:15, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {/* Search results */}
        {showSearch && searchResults.length > 0 && (
          <div style={{ maxHeight:240, overflowY:"auto", borderTop:`1px solid ${BORDER}` }}>
            {searchResults.map(r => (
              <div key={r.index}
                onClick={() => { setCurrent(r.index); setShowSearch(false); setSearchQuery(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
                  borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:"pointer",
                  background:"rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize:10, color:TEAL, fontWeight:700, minWidth:22,
                  background:`${TEAL}18`, border:`1px solid ${TEAL}30`, borderRadius:6,
                  padding:"2px 5px", textAlign:"center" }}>{r.index + 1}</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.85)" }}>{r.title}</span>
              </div>
            ))}
          </div>
        )}
        {showSearch && q.length >= 1 && searchResults.length === 0 && (
          <div style={{ padding:"12px 18px", fontSize:12, color:"rgba(255,255,255,0.3)",
            borderTop:`1px solid ${BORDER}` }}>
            {L(lang,"No slides found","Слайдів не знайдено")}
          </div>
        )}
      </div>

      {/* Slide area */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(170deg,${BG} 0%,#0b1020 40%,${BG} 100%)` }} />
          <div style={{ position:"absolute", top:-160, left:-80, width:380, height:380, borderRadius:"50%",
            background:`radial-gradient(circle,${TEAL}18 0%,transparent 68%)`,
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
          {SLIDES_V.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: i === current ? 22 : 6, height: 6, borderRadius: 3,
              background: i === current ? accentColor : "rgba(255,255,255,0.16)",
              border:"none", padding:0, cursor:"pointer",
              transition:"all 0.2s", flexShrink:0,
            }} />
          ))}
        </div>

        <button onClick={current === TOTAL_V - 1 ? onClose : next}
          style={{
            background: current === TOTAL_V - 1
              ? `linear-gradient(135deg,${GREEN},${TEAL})`
              : `linear-gradient(135deg,${TEAL},${PURPLE})`,
            border:"none", borderRadius:11, padding:"9px 16px", fontSize:13,
            color:"#fff", fontWeight:700, cursor:"pointer",
            boxShadow:`0 0 14px ${TEAL}3a`, flexShrink:0 }}>
          {current === TOTAL_V - 1 ? L(lang,"✓ Close","✓ Закрити") : L(lang,"Next →","Далі →")}
        </button>
      </div>
    </div>
  );
}
