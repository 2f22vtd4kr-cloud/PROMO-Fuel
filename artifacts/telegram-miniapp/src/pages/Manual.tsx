import { useState, useRef, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";

interface Props { onClose: () => void }
type SL = { lang: Lang };

const ACCENT = "#00d4ff";
const PURPLE = "#a855f7";
const AMBER  = "#f59e0b";
const GREEN  = "#10d88a";
const PINK   = "#f472b6";
const BLUE   = "#3b82f6";
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

const row = (icon: string, label: string, color: string, desc: string) => (
  <div key={label} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:9,
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

const step = (n: number, color: string, title: string, desc: string) => (
  <div key={n} style={{ display:"flex", gap:13, alignItems:"flex-start", marginBottom:15 }}>
    <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}22`,
      border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:13, fontWeight:800, color, flexShrink:0, minWidth:32 }}>{n}</div>
    <div>
      <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:3 }}>{title}</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.58)", lineHeight:1.5 }}>{desc}</div>
    </div>
  </div>
);

const title = (icon: string, text: string, color = ACCENT) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
    <div style={{ width:40, height:40, borderRadius:12, background:`${color}20`,
      border:`1.5px solid ${color}55`, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:20 }}>{icon}</div>
    <div style={{ fontSize:20, fontWeight:800, color:"#fff", letterSpacing:-0.3 }}>{text}</div>
  </div>
);

function Shell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:"absolute", inset:0, overflowY:"auto", overflowX:"hidden",
      padding:"26px 20px 36px", display:"flex", flexDirection:"column", ...style }}>
      {children}
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return <span style={{ background:`${color}22`, border:`1px solid ${color}44`, color,
    borderRadius:7, padding:"2px 9px", fontSize:11, fontWeight:600, marginRight:5,
    display:"inline-block", marginBottom:3 }}>{label}</span>;
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════
function Slide1({ lang }: SL) {
  const topics = lang === "ua"
    ? [["🎯","Кампанії"],["👥","Аудиторія"],["📊","Аналітика"],["🤖","Воркери"],["🏗️","Архітектура"],["🔐","Протоколи"]]
    : [["🎯","Campaigns"],["👥","Audience"],["📊","Analytics"],["🤖","Workers"],["🏗️","Architecture"],["🔐","Protocols"]];
  return (
    <Shell style={{ alignItems:"center", justifyContent:"center", textAlign:"center" }}>
      <div style={{ width:88, height:88, borderRadius:26,
        background:`linear-gradient(135deg,${ACCENT}33,${PURPLE}33)`,
        border:`2px solid ${ACCENT}55`, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:44, marginBottom:24,
        boxShadow:`0 0 40px ${ACCENT}33` }}>⛽</div>
      <div style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:-1, lineHeight:1.1, marginBottom:10 }}>
        PROMO-Fuel
      </div>
      <div style={{ fontSize:16, fontWeight:600, color:ACCENT, marginBottom:5 }}>
        {L(lang,"User Manual","Посібник користувача")}
      </div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.38)", marginBottom:30 }}>
        {L(lang,"Complete system reference · 25 pages","Повний опис системи · 25 сторінок")}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
        {topics.map(([ic,lb]) => (
          <div key={lb} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11,
            padding:"8px 12px", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
            display:"flex", alignItems:"center", gap:5 }}><span>{ic}</span><span>{lb}</span></div>
        ))}
      </div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginTop:"auto", paddingTop:16 }}>
        {L(lang,"Swipe right →","Гортайте вправо →")}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — System Overview
// ═══════════════════════════════════════════════════════════════
function Slide2({ lang }: SL) {
  const mods = lang === "ua" ? [
    {icon:"🏠",color:ACCENT, name:"Головна",    desc:"Дашборд метрик"},
    {icon:"📢",color:PURPLE, name:"Розсилки",   desc:"DM-кампанії"},
    {icon:"🔗",color:GREEN,  name:"Групи",      desc:"Групові розсилки"},
    {icon:"📈",color:AMBER,  name:"Статистика", desc:"Аналітика та графіки"},
    {icon:"👤",color:PINK,   name:"Аудиторія",  desc:"Сегменти користувачів"},
    {icon:"🔐",color:ACCENT, name:"Акаунти",    desc:"Sender-акаунти TG"},
    {icon:"⚙️",color:PURPLE, name:"Воркери",    desc:"Фонові процеси"},
    {icon:"🔑",color:AMBER,  name:"AUTH",       desc:"Авторизація акаунтів"},
  ] : [
    {icon:"🏠",color:ACCENT, name:"Home",       desc:"Metrics dashboard"},
    {icon:"📢",color:PURPLE, name:"Campaigns",  desc:"DM campaigns"},
    {icon:"🔗",color:GREEN,  name:"Groups",     desc:"Group broadcasts"},
    {icon:"📈",color:AMBER,  name:"Stats",      desc:"Analytics & charts"},
    {icon:"👤",color:PINK,   name:"Audience",   desc:"User segments"},
    {icon:"🔐",color:ACCENT, name:"Accounts",   desc:"TG sender accounts"},
    {icon:"⚙️",color:PURPLE, name:"Workers",    desc:"Background processes"},
    {icon:"🔑",color:AMBER,  name:"AUTH",       desc:"Account authorization"},
  ];
  return (
    <Shell>
      {title("🗺️", L(lang,"System Overview","Огляд системи"), ACCENT)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:16, lineHeight:1.5 }}>
        {L(lang,"PROMO-Fuel — Telegram mass-messaging platform. 8 modules:","PROMO-Fuel — платформа масових Telegram-розсилок. 8 модулів:")}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {mods.map(m => (
          <div key={m.name} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:13, padding:"13px" }}>
            <div style={{ fontSize:24, marginBottom:5 }}>{m.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:m.color, marginBottom:2 }}>{m.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)", lineHeight:1.4 }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — Dashboard
// ═══════════════════════════════════════════════════════════════
function Slide3({ lang }: SL) {
  const metrics = lang === "ua" ? [
    {icon:"📤",color:ACCENT,label:"Надіслано",         desc:"Всього за весь час"},
    {icon:"🔥",color:PINK,  label:"Активні кампанії", desc:"Зараз в роботі"},
    {icon:"👥",color:GREEN, label:"Охоплення",         desc:"Унікальні отримувачі"},
    {icon:"👁️",color:AMBER, label:"Open rate",         desc:"Конверсія за прочитанням"},
  ] : [
    {icon:"📤",color:ACCENT,label:"Sent",              desc:"Total messages ever"},
    {icon:"🔥",color:PINK,  label:"Active campaigns",  desc:"Currently running"},
    {icon:"👥",color:GREEN, label:"Reach",             desc:"Unique recipients"},
    {icon:"👁️",color:AMBER, label:"Open rate",         desc:"Read conversion"},
  ];
  return (
    <Shell>
      {title("🏠", L(lang,"Home / Dashboard","Головна / Дашборд"), ACCENT)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Central screen: real-time key metrics, worker status, and quick-action shortcuts.",
          "Центральний екран: ключові метрики в реальному часі, статус воркерів та швидкі дії."
        )}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background:GLASS, border:`1px solid ${m.color}30`,
            borderRadius:13, padding:"13px", boxShadow:`0 0 12px ${m.color}12` }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{m.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:m.color, marginBottom:2 }}>{m.label}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{m.desc}</div>
          </div>
        ))}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:5 }}>
          {L(lang,"Worker status strip","Смуга статусу воркерів")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Top banner shows active worker count. Green dots = running. Tap to jump to Workers tab.",
            "Верхній банер показує кількість активних воркерів. Зелені точки = активні. Тап → вкладка Воркери."
          )}
        </div>
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:12, color:PURPLE, fontWeight:700, marginBottom:5 }}>
          {L(lang,"Recent campaigns strip","Останні кампанії")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Up to 3 most recent campaigns shown with progress bar and sent/total counters.",
            "До 3 найновіших кампаній з прогрес-баром та лічильниками надіслано/всього."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — Quick Actions
// ═══════════════════════════════════════════════════════════════
function Slide4({ lang }: SL) {
  const acts = lang === "ua" ? [
    ["📢",ACCENT, "Нова розсилка",  "Відкриває редактор DM-кампанії"],
    ["🔗",GREEN,  "Групи",          "Перейти до групових розсилок"],
    ["📊",AMBER,  "Статистика",     "Аналітика та графіки"],
    ["👤",PINK,   "Аудиторія",      "Управління сегментами"],
    ["🔐",PURPLE, "Акаунти",        "Sender-акаунти Telegram"],
    ["⚙️",ACCENT, "Воркери",        "Моніторинг фонових процесів"],
  ] : [
    ["📢",ACCENT, "New campaign",   "Opens the DM campaign editor"],
    ["🔗",GREEN,  "Groups",         "Go to group broadcasts"],
    ["📊",AMBER,  "Stats",          "Analytics & charts"],
    ["👤",PINK,   "Audience",       "Manage segments"],
    ["🔐",PURPLE, "Accounts",       "Telegram sender accounts"],
    ["⚙️",ACCENT, "Workers",        "Monitor background processes"],
  ];
  return (
    <Shell>
      {title("⚡", L(lang,"Quick Actions","Швидкі дії"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:16, lineHeight:1.5 }}>
        {L(lang,
          "The Quick Actions row on Home gives one-tap access to all 6 core functions.",
          "Блок «Швидкі дії» на головній — миттєвий доступ до 6 ключових функцій одним дотиком."
        )}
      </div>
      {acts.map(([ic,col,lb,desc]) => row(ic as string, lb as string, col as string, desc as string))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — DM Campaigns
// ═══════════════════════════════════════════════════════════════
function Slide5({ lang }: SL) {
  const statuses = lang === "ua" ? [
    ["🟢","running", GREEN,    "Активна — розсилка відбувається"],
    ["🟡","paused",  AMBER,    "Пауза — зупинена вручну"],
    ["🔵","finished",BLUE,     "Завершена — всі повідомлення надіслано"],
    ["⚫","draft",   "#6b7280","Чернетка — ще не запущена"],
  ] : [
    ["🟢","running", GREEN,    "Active — broadcast in progress"],
    ["🟡","paused",  AMBER,    "Paused — stopped manually"],
    ["🔵","finished",BLUE,     "Finished — all messages sent"],
    ["⚫","draft",   "#6b7280","Draft — not started yet"],
  ];
  return (
    <Shell>
      {title("📢", L(lang,"DM Campaigns","DM-розсилки"), PURPLE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Send personalized messages directly to individual users in your audience database.",
          "Надсилайте персоналізовані повідомлення безпосередньо окремим користувачам у базі аудиторії."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Campaign statuses","Статуси кампанії")}
        </div>
        {statuses.map(([dot,key,col,desc]) => (
          <div key={key} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:14 }}>{dot}</span>
            <div><span style={{ fontSize:13, fontWeight:600, color:col as string }}>{key} </span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.48)" }}>— {desc}</span></div>
          </div>
        ))}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"List actions","Дії у списку")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.9 }}>
          {L(lang,
            "✏️ Edit  ·  ⏸️/▶️ Pause/Resume  ·  🗑️ Delete  ·  📋 View send logs",
            "✏️ Редагувати  ·  ⏸️/▶️ Пауза/Відновити  ·  🗑️ Видалити  ·  📋 Логи"
          )}
        </div>
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:4 }}>
          {L(lang,"💡 Search bar","💡 Пошук")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Appears automatically with 4+ campaigns. Filter by name or status.",
            "З'являється автоматично при 4+ кампаніях. Фільтр за назвою або статусом."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — Campaign Editor
// ═══════════════════════════════════════════════════════════════
function Slide6({ lang }: SL) {
  const fields = lang === "ua" ? [
    ["🏷️",ACCENT,  "Назва",               "Внутрішнє ім'я кампанії"],
    ["💬",PURPLE,  "Текст повідомлення",  "Підтримує {спінтакс|варіації}"],
    ["🔐",PINK,    "Акаунт",              "Sender-акаунт для відправки"],
    ["👥",GREEN,   "Аудиторія",           "Сегмент або всі користувачі"],
    ["⏱️",AMBER,   "Затримка",            "Секунди між повідомленнями"],
    ["📎",ACCENT,  "Медіа",               "Фото, відео, документи (опційно)"],
  ] : [
    ["🏷️",ACCENT,  "Name",                "Internal campaign name"],
    ["💬",PURPLE,  "Message text",        "Supports {spintax|variations}"],
    ["🔐",PINK,    "Account",             "Sender account for delivery"],
    ["👥",GREEN,   "Audience",            "Segment or all users"],
    ["⏱️",AMBER,   "Delay",               "Seconds between messages"],
    ["📎",ACCENT,  "Media",               "Photo, video, document (optional)"],
  ];
  return (
    <Shell>
      {title("✏️", L(lang,"Campaign Editor","Редактор кампанії"), PINK)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Create and configure a campaign. Open with «New campaign» button or via edit.",
          "Створення та налаштування кампанії. Відкривається кнопкою «Нова розсилка» або редагуванням."
        )}
      </div>
      {fields.map(([ic,col,lb,desc]) => row(ic as string, lb as string, col as string, desc as string))}
      <div style={{ ...card(AMBER), marginTop:4 }}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:5 }}>💡 Spintax</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,"Use ","Використовуйте ")}
          <code style={{ background:GLASS2, padding:"1px 5px", borderRadius:4, color:"#fff" }}>
            &#123;text1|text2|text3&#125;
          </code>
          {L(lang,
            " to auto-rotate text on every send — keeps each message unique.",
            " для автоматичної ротації тексту при кожній відправці — кожне повідомлення унікальне."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — Groups Module
// ═══════════════════════════════════════════════════════════════
function Slide7({ lang }: SL) {
  const steps = lang === "ua" ? [
    [1,GREEN,  "Прив'яжіть акаунт",    "Sender-акаунт, що є учасником потрібних груп — у розділі «Акаунти»"],
    [2,ACCENT, "Оновіть список",       "Кнопка «Оновити групи» — синхронізація з Telegram через MTProto"],
    [3,PURPLE, "Виберіть для розсилки","Відмітьте потрібні групи в редакторі групової кампанії"],
  ] : [
    [1,GREEN,  "Link an account",      "A sender account that is a member of the target groups — in Accounts section"],
    [2,ACCENT, "Refresh list",         "«Refresh groups» button — syncs with Telegram via MTProto"],
    [3,PURPLE, "Select for broadcast", "Check the needed groups in the group campaign editor"],
  ];
  return (
    <Shell>
      {title("🔗", L(lang,"Groups","Групи"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The Groups tab manages Telegram groups and channels available for mass broadcasts.",
          "Вкладка «Групи» управляє Telegram-групами та каналами для масових розсилок."
        )}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:12 }}>
          {L(lang,"Where do groups come from?","Звідки беруться групи?")}
        </div>
        {steps.map(([n,col,t,d]) => step(n as number, col as string, t as string, d as string))}
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Group management","Управління групами")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.9 }}>
          {L(lang,
            "🚫 Ban group — exclude from all broadcasts\n✅ Unban — return to pool\n🔄 Refresh all groups",
            "🚫 Заблокувати — виключити з усіх розсилок\n✅ Розблокувати — повернути в пул\n🔄 Оновити список груп"
          )}
        </div>
      </div>
      <div style={card(BLUE)}>
        <div style={{ fontSize:12, color:BLUE, fontWeight:700, marginBottom:4 }}>
          {L(lang,"ℹ️ Supported types","ℹ️ Підтримувані типи")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Supergroups, basic groups, public channels. Private channels require the account to be a member or admin.",
            "Супергрупи, звичайні групи, публічні канали. Приватні канали вимагають участі або адміністрування."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — Group Broadcasts
// ═══════════════════════════════════════════════════════════════
function Slide8({ lang }: SL) {
  const items = lang === "ua" ? [
    ["📋",PURPLE, "Список кампаній",       "Всі кампанії зі статусом та прогресом"],
    ["➕",ACCENT,  "Створити нову",         "Кнопка «+» відкриває редактор"],
    ["📊",GREEN,   "Статистика",            "Вкладка «Стат» — звіт по групах"],
    ["📝",AMBER,   "Логи",                  "Вкладка «Логи» — хронологія надсилань"],
    ["⬇️",PINK,   "Експорт CSV",           "Вивантажити логи/статистику у файл"],
    ["⏱️",BLUE,   "Таймер наступного запуску","Зворотний відлік до наступної ітерації"],
  ] : [
    ["📋",PURPLE, "Campaign list",         "All campaigns with status and progress"],
    ["➕",ACCENT,  "Create new",            "«+» button opens the editor"],
    ["📊",GREEN,   "Statistics",            "«Stats» tab — detailed per-group report"],
    ["📝",AMBER,   "Logs",                  "«Logs» tab — chronological send history"],
    ["⬇️",PINK,   "CSV export",            "Download logs/stats as a file"],
    ["⏱️",BLUE,   "Next-send countdown",   "Live timer to the next iteration"],
  ];
  return (
    <Shell>
      {title("📡", L(lang,"Group Broadcasts","Групові розсилки"), PURPLE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Group campaigns post messages into Telegram groups/channels, not private chats.",
          "Групові кампанії надсилають повідомлення в Telegram-групи/канали, а не в приватні чати."
        )}
      </div>
      {items.map(([ic,col,lb,desc]) => row(ic as string, lb as string, col as string, desc as string))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — Group Campaign Settings
// ═══════════════════════════════════════════════════════════════
function Slide9({ lang }: SL) {
  const fields = lang === "ua" ? [
    ["🏷️",ACCENT,  "Назва кампанії",        "Внутрішній ідентифікатор"],
    ["📝",PURPLE,  "Шаблон повідомлення",   "Виберіть або введіть текст зі спінтаксом"],
    ["🔐",PINK,    "Sender-акаунт",         "Акаунт, від якого йдуть повідомлення"],
    ["👥",GREEN,   "Вибір груп",            "Відмітьте всі або окремі групи"],
    ["🕐",AMBER,   "Інтервал між групами",  "Секунди — захист від flood-бану"],
    ["🔄",BLUE,    "Повтор розсилки",       "Розклад: раз на N годин"],
    ["📎",PINK,    "Медіа-вкладення",       "Фото або відео (необов'язково)"],
  ] : [
    ["🏷️",ACCENT,  "Campaign name",         "Internal identifier"],
    ["📝",PURPLE,  "Message template",      "Select or type text with spintax"],
    ["🔐",PINK,    "Sender account",        "Account messages are sent from"],
    ["👥",GREEN,   "Group selection",       "Check all or individual groups"],
    ["🕐",AMBER,   "Interval between groups","Seconds — protects from flood ban"],
    ["🔄",BLUE,    "Repeat schedule",       "Schedule: every N hours"],
    ["📎",PINK,    "Media attachment",      "Photo or video (optional)"],
  ];
  return (
    <Shell>
      {title("⚙️", L(lang,"Campaign Settings","Налаштування кампанії"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Key parameters when creating a group broadcast campaign.",
          "Ключові параметри при створенні групової рекламної кампанії."
        )}
      </div>
      {fields.map(([ic,col,lb,desc]) => row(ic as string, lb as string, col as string, desc as string))}
      <div style={{ ...card(AMBER), marginTop:4 }}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:4 }}>
          {L(lang,"⚠️ Recommendation","⚠️ Рекомендація")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Set at least 15–30 s between groups to avoid FloodWait errors from Telegram.",
            "Встановлюйте не менше 15–30 с між групами, щоб уникнути помилок FloodWait від Telegram."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — Step-by-Step: Full Group Campaign Walkthrough
// ═══════════════════════════════════════════════════════════════
function Slide10({ lang }: SL) {
  const steps = lang === "ua" ? [
    [0,BLUE,   "Отримайте API-ключі Telegram",
      "Зайдіть на my.telegram.org → «API development tools» → створіть додаток. Збережіть api_id та api_hash — вони знадобляться для кожного sender-акаунта."],
    [1,AMBER,  "Додайте sender-акаунт",
      "Вкладка «Акаунти» → «+» → введіть номер телефону, api_id, api_hash. Натисніть «Авторизувати» та введіть код, що прийде в Telegram."],
    [2,GREEN,  "Переконайтесь, що акаунт у статусі idle",
      "Статус акаунта має стати зеленим (idle). Якщо flood_wait — зачекайте. Якщо banned — потрібен інший акаунт."],
    [3,PURPLE, "Запустіть воркер",
      "Вкладка «Воркери» → скопіюйте команду запуску (📋) → виконайте в терміналі. Воркер має бути в статусі running або idle."],
    [4,PINK,   "Завантажте список груп",
      "Вкладка «Групи» → натисніть «Оновити групи». Акаунт підключиться через MTProto та завантажить усі доступні групи, де є учасником."],
    [5,ACCENT, "Відфільтруйте небажані групи",
      "Натисніть 🚫 біля груп, куди не потрібно надсилати. Заблоковані групи виключаються з усіх майбутніх кампаній."],
    [6,GREEN,  "Створіть групову кампанію",
      "Вкладка «Групи» → «+» → вкажіть назву, виберіть шаблон або напишіть текст зі спінтаксом, вкажіть акаунт, виберіть групи, встановіть інтервал (мін. 20 с)."],
    [7,AMBER,  "Налаштуйте повторення (опційно)",
      "Якщо потрібна регулярна розсилка — вкажіть «кожні N годин». Система автоматично перезапустить кампанію за розкладом."],
    [8,PURPLE, "Активуйте та моніторте",
      "Натисніть «Запустити». Воркер отримає задачу і почне надсилати по черзі в кожну групу. Спостерігайте за прогресом у вкладці «Логи»."],
  ] : [
    [0,BLUE,   "Get Telegram API keys",
      "Go to my.telegram.org → «API development tools» → create an app. Save the api_id and api_hash — required for every sender account."],
    [1,AMBER,  "Add a sender account",
      "Accounts tab → «+» → enter phone number, api_id, api_hash. Click «Authorize» and enter the code that arrives in Telegram."],
    [2,GREEN,  "Verify account status is idle",
      "Account status must turn green (idle). If flood_wait — wait it out. If banned — you need a different account."],
    [3,PURPLE, "Start a worker",
      "Workers tab → copy the start command (📋) → run it in your terminal. Worker must be in running or idle status."],
    [4,PINK,   "Load the group list",
      "Groups tab → click «Refresh groups». The account connects via MTProto and downloads all groups it is a member of."],
    [5,ACCENT, "Filter out unwanted groups",
      "Tap 🚫 next to groups you don't want to send to. Banned groups are excluded from all future campaigns."],
    [6,GREEN,  "Create a group campaign",
      "Groups tab → «+» → set a name, choose a template or write text with spintax, pick the account, select groups, set interval (min 20 s)."],
    [7,AMBER,  "Set a repeat schedule (optional)",
      "If recurring sends are needed — set «every N hours». The system will auto-restart the campaign on schedule."],
    [8,PURPLE, "Activate and monitor",
      "Click «Start». The worker picks up the task and posts to each group in sequence. Watch progress in the «Logs» tab."],
  ];
  return (
    <Shell>
      {title("🚀", L(lang,"Step-by-Step: Group Campaign","Крок за кроком: групова кампанія"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:16, lineHeight:1.5 }}>
        {L(lang,
          "Complete walkthrough from zero to a live group broadcast. Follow every step in order.",
          "Повний порядок дій від нуля до живої групової розсилки. Виконуйте кожен крок по черзі."
        )}
      </div>
      {steps.map(([n,col,t,d]) => step(n as number, col as string, t as string, d as string))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — Analytics
// ═══════════════════════════════════════════════════════════════
function Slide11({ lang }: SL) {
  const metrics = lang === "ua" ? [
    {icon:"📤",color:ACCENT,    label:"Всього надіслано",  val:"Загальна кількість повідомлень"},
    {icon:"✅",color:GREEN,     label:"Успішно",           val:"Доставлено без помилок"},
    {icon:"❌",color:"#ef4444", label:"Помилки",           val:"Недоставлені повідомлення"},
    {icon:"👥",color:PURPLE,   label:"Охоплення",         val:"Унікальні одержувачі"},
    {icon:"👁️",color:PINK,     label:"Open rate",         val:"Конверсія за прочитанням"},
    {icon:"🔥",color:AMBER,    label:"Активних кампаній", val:"Зараз в роботі"},
  ] : [
    {icon:"📤",color:ACCENT,    label:"Total sent",        val:"All messages ever sent"},
    {icon:"✅",color:GREEN,     label:"Successful",        val:"Delivered without errors"},
    {icon:"❌",color:"#ef4444", label:"Errors",            val:"Undelivered messages"},
    {icon:"👥",color:PURPLE,   label:"Reach",             val:"Unique recipients"},
    {icon:"👁️",color:PINK,     label:"Open rate",         val:"Read conversion"},
    {icon:"🔥",color:AMBER,    label:"Active campaigns",  val:"Currently running"},
  ];
  return (
    <Shell>
      {title("📊", L(lang,"Analytics","Статистика"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The Stats tab contains detailed SVG charts and reports across all campaigns.",
          "Вкладка «Стат.» містить детальні SVG-графіки та звіти по всіх кампаніях."
        )}
      </div>
      {metrics.map(m => (
        <div key={m.label} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:8,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"10px 13px" }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${m.color}20`,
            border:`1px solid ${m.color}40`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:15, flexShrink:0 }}>{m.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{m.label}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{m.val}</div>
          </div>
          <div style={{ width:7, height:7, borderRadius:"50%", background:m.color }} />
        </div>
      ))}
      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, color:ACCENT, fontWeight:700, marginBottom:4 }}>
          {L(lang,"📈 Charts included","📈 Доступні графіки")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Daily send dynamics · per-campaign distribution · hourly send rate · error percentage · campaign performance comparison.",
            "Динаміка надсилань по днях · розподіл по кампаніях · погодинна швидкість · відсоток помилок · порівняння ефективності кампаній."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — Audience
// ═══════════════════════════════════════════════════════════════
function Slide12({ lang }: SL) {
  const feats = lang === "ua" ? [
    ["👁️","Перегляд",  PINK,   "Вся база з фільтрами та пошуком"],
    ["🏷️","Сегменти",  PURPLE, "Групування за тегами та параметрами"],
    ["📤","Експорт",   GREEN,  "Вивантаження в CSV для зовнішньої роботи"],
    ["📥","Імпорт",    ACCENT, "Завантаження аудиторії через Upload"],
  ] : [
    ["👁️","View",      PINK,   "Full user base with filters and search"],
    ["🏷️","Segments",  PURPLE, "Group by tags and parameters"],
    ["📤","Export",    GREEN,  "Download to CSV for external use"],
    ["📥","Import",    ACCENT, "Upload audience via the Upload tab"],
  ];
  return (
    <Shell>
      {title("👤", L(lang,"Audience","Аудиторія"), PINK)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "User database management and segment creation for targeted DM campaigns.",
          "Управління базою користувачів та створення сегментів для точних DM-розсилок."
        )}
      </div>
      <div style={card(PINK)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Section features","Функції розділу")}
        </div>
        {feats.map(([ic,lb,col,desc]) => (
          <div key={lb} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:9 }}>
            <span style={{ fontSize:15 }}>{ic}</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:col as string }}>{lb}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"User data fields","Поля даних")}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {["chat_id","username","first_name","last_name","tags","created_at"].map(f => (
            <span key={f} style={{ background:GLASS2, border:`1px solid ${BORDER}`,
              borderRadius:6, padding:"3px 8px", fontSize:11, color:"rgba(255,255,255,0.7)" }}>{f}</span>
          ))}
        </div>
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:4 }}>
          {L(lang,"💡 Segmentation tip","💡 Сегментація")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Create named segments with tag filters. Assign a segment to a DM campaign to target only that group — other users are skipped.",
            "Створюйте іменовані сегменти з фільтрами за тегами. Призначте сегмент DM-кампанії — інші користувачі будуть пропущені."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — Sender Accounts
// ═══════════════════════════════════════════════════════════════
function Slide13({ lang }: SL) {
  const statuses = lang === "ua" ? [
    ["🟢","idle",       ACCENT,    "Готовий до роботи"],
    ["🔵","sending",    BLUE,      "Активна відправка"],
    ["🟡","flood_wait", AMBER,     "Обмеження Telegram — тимчасово"],
    ["🔴","banned",     "#ef4444", "Акаунт заблокований Telegram"],
    ["⚫","inactive",   "#6b7280", "Деактивовано вручну"],
  ] : [
    ["🟢","idle",       ACCENT,    "Ready to send"],
    ["🔵","sending",    BLUE,      "Actively sending"],
    ["🟡","flood_wait", AMBER,     "Telegram rate-limited — temporary"],
    ["🔴","banned",     "#ef4444", "Account banned by Telegram"],
    ["⚫","inactive",   "#6b7280", "Manually deactivated"],
  ];
  return (
    <Shell>
      {title("🔐", L(lang,"Sender Accounts","Sender-акаунти"), ACCENT)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Sender accounts are the Telegram user accounts from which broadcasts are executed via MTProto.",
          "Sender-акаунти — це Telegram-акаунти, від імені яких виконуються розсилки через MTProto."
        )}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Account statuses","Статуси акаунта")}
        </div>
        {statuses.map(([dot,key,col,desc]) => (
          <div key={key} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:14 }}>{dot}</span>
            <span style={{ fontSize:13, fontWeight:700, color:col as string }}>{key}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>— {desc}</span>
          </div>
        ))}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Account parameters","Параметри акаунта")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.9 }}>
          {L(lang,
            "📱 Phone number\n🔑 api_id + api_hash (my.telegram.org)\n🌐 Proxy (optional, SOCKS5)\n📊 Daily send limit\n📁 Session file",
            "📱 Номер телефону\n🔑 api_id + api_hash (my.telegram.org)\n🌐 Проксі (опційно, SOCKS5)\n📊 Денний ліміт відправок\n📁 Файл сесії"
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 14 — Account Authorization
// ═══════════════════════════════════════════════════════════════
function Slide14({ lang }: SL) {
  const steps = lang === "ua" ? [
    [1,AMBER,  "Отримайте API-ключі",       "Зайдіть на my.telegram.org → API development tools → створіть додаток"],
    [2,ACCENT, "Додайте акаунт",            "Вкладка «Акаунти» → «+» → введіть телефон, api_id, api_hash"],
    [3,GREEN,  "Натисніть «Авторизувати»",  "Кнопка AUTH біля акаунта — система надішле код у Telegram"],
    [4,PURPLE, "Введіть код",               "Код з Telegram (або SMS) у поле, що з'явиться"],
    [5,PINK,   "Пароль 2FA (якщо є)",       "Якщо увімкнена двофакторка — введіть Cloud Password"],
    [6,GREEN,  "Готово!",                   "Статус → idle (зелений). Акаунт готовий до розсилок"],
  ] : [
    [1,AMBER,  "Get API keys",              "Go to my.telegram.org → API development tools → create app"],
    [2,ACCENT, "Add account",               "Accounts tab → «+» → enter phone, api_id, api_hash"],
    [3,GREEN,  "Click «Authorize»",         "AUTH button next to the account — system sends code to Telegram"],
    [4,PURPLE, "Enter code",                "Enter code from Telegram (or SMS) in the field that appears"],
    [5,PINK,   "2FA password (if set)",     "If two-factor auth is enabled — enter your Cloud Password"],
    [6,GREEN,  "Done!",                     "Status → idle (green). Account ready for broadcasts"],
  ];
  return (
    <Shell>
      {title("🔑", L(lang,"Account Authorization","Авторизація акаунта"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Step-by-step: connecting a new Telegram account to the broadcasting system.",
          "Покроково: підключення нового Telegram-акаунта до системи розсилок."
        )}
      </div>
      {steps.map(([n,col,t,d]) => step(n as number, col as string, t as string, d as string))}
      <div style={{ ...card(AMBER), marginTop:2 }}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:4 }}>
          {L(lang,"⚠️ Important","⚠️ Важливо")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Use only your own accounts. New accounts have very low sending limits for the first 2–4 weeks of activity.",
            "Використовуйте лише власні акаунти. Нові акаунти мають дуже низькі ліміти відправки перші 2–4 тижні активності."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 15 — Workers
// ═══════════════════════════════════════════════════════════════
function Slide15({ lang }: SL) {
  const statuses = lang === "ua" ? [
    ["🟢","running", GREEN,    "Воркер активний, обробляє задачі"],
    ["🟡","idle",    AMBER,    "Воркер запущений, очікує задач"],
    ["🔴","crashed", "#ef4444","Аварійне завершення — перевірте логи"],
    ["⚫","stopped", "#6b7280","Зупинений вручну"],
  ] : [
    ["🟢","running", GREEN,    "Worker active, processing tasks"],
    ["🟡","idle",    AMBER,    "Worker running, waiting for tasks"],
    ["🔴","crashed", "#ef4444","Crashed — check logs"],
    ["⚫","stopped", "#6b7280","Stopped manually"],
  ];
  const tiles = lang === "ua" ? [
    ["✅","Виконано",  GREEN,    "Задач завершено за весь час"],
    ["❌","Помилок",   "#ef4444","Задач завершилось з помилкою"],
    ["💓","Пульс",     ACCENT,   "Час з останнього heartbeat"],
    ["📤","Сьогодні",  GREEN,    "Повідомлень надіслано прив'язаним акаунтом"],
  ] : [
    ["✅","Done",     GREEN,    "Tasks completed over all time"],
    ["❌","Errors",   "#ef4444","Tasks that failed"],
    ["💓","Heartbeat",ACCENT,   "Time since last heartbeat"],
    ["📤","Today",    GREEN,    "Messages sent by linked account today"],
  ];
  return (
    <Shell>
      {title("⚙️", L(lang,"Workers","Воркери"), PURPLE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:12, lineHeight:1.5 }}>
        {L(lang,
          "Workers are background processes that claim and execute broadcast tasks.",
          "Воркери — фонові процеси, що захоплюють та виконують задачі розсилок."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Statuses","Статуси")}
        </div>
        {statuses.map(([dot,key,col,desc]) => (
          <div key={key} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
            <span>{dot}</span>
            <div><span style={{ fontSize:13, fontWeight:700, color:col as string }}>{key} </span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>— {desc}</span></div>
          </div>
        ))}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Card tiles","Плитки карточки")}
        </div>
        {tiles.map(([ic,lb,col,desc]) => (
          <div key={lb} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
            <span style={{ flexShrink:0 }}>{ic}</span>
            <div><span style={{ fontSize:13, fontWeight:700, color:col as string }}>{lb} </span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>— {desc}</span></div>
          </div>
        ))}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:4 }}>
          {L(lang,"⏱️ Speed panel","⏱️ Панель швидкості")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.58)", lineHeight:1.55 }}>
          {L(lang,
            "«Speed / min — all accounts» widget below the summary tiles. Mini bar per active account, updates every 15 s. 🟢 free · 🟡 moderate · 🔴 critical.",
            "Віджет «Швидкість / хв — всі акаунти» під підсумковими плитками. Мінi-смуга на акаунт, оновлення 15 с. 🟢 вільно · 🟡 помірно · 🔴 критично."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 16 — Task Queue
// ═══════════════════════════════════════════════════════════════
function Slide16({ lang }: SL) {
  const states = lang === "ua" ? [
    {icon:"📥",color:ACCENT,    name:"pending",  desc:"Задача чекає вільного воркера"},
    {icon:"⚡",color:GREEN,     name:"running",  desc:"Воркер активно обробляє задачу"},
    {icon:"✅",color:GREEN,     name:"done",     desc:"Задача виконана успішно"},
    {icon:"❌",color:"#ef4444", name:"failed",   desc:"Помилка — задача зупинена"},
    {icon:"🔄",color:AMBER,     name:"retrying", desc:"Повторна спроба після помилки"},
  ] : [
    {icon:"📥",color:ACCENT,    name:"pending",  desc:"Waiting for a free worker"},
    {icon:"⚡",color:GREEN,     name:"running",  desc:"Worker actively processing"},
    {icon:"✅",color:GREEN,     name:"done",     desc:"Task completed successfully"},
    {icon:"❌",color:"#ef4444", name:"failed",   desc:"Error — task stopped"},
    {icon:"🔄",color:AMBER,     name:"retrying", desc:"Retry after failure"},
  ];
  return (
    <Shell>
      {title("📋", L(lang,"Task Queue","Черга задач"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The queue distributes tasks across workers with parallel processing and auto-recovery after crashes.",
          "Черга розподіляє задачі між воркерами з паралельною обробкою та авто-відновленням після збоїв."
        )}
      </div>
      {states.map(s => (
        <div key={s.name} style={{ display:"flex", gap:12, alignItems:"center", marginBottom:8,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11, padding:"10px 13px" }}>
          <span style={{ fontSize:17 }}>{s.icon}</span>
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.name}</span>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:4 }}>
          {L(lang,"🔒 3-layer reliability","🔒 3-рівнева надійність")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.55 }}>
          {L(lang,
            "asyncio.Lock + FileLock + SQL WHERE locked_by IS NULL — prevents any two workers from claiming the same task. Exponential backoff retry. Max 5 crashes before worker halts and sends an alert.",
            "asyncio.Lock + FileLock + SQL WHERE locked_by IS NULL — жодні два воркери не можуть захопити одну задачу. Повтор з експоненціальним бекофом. Максимум 5 падінь — потім зупинка та сповіщення."
          )}
        </div>
      </div>
      <div style={card(BLUE)}>
        <div style={{ fontSize:12, color:BLUE, fontWeight:700, marginBottom:4 }}>
          {L(lang,"Resume cursors — zero duplicates","Курсори відновлення — нуль дублікатів")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "If a worker crashes mid-campaign, it resumes from the last successfully sent group. Powered by the group_send_logs table keyed on (task_id, group_id).",
            "При падінні воркера посередині кампанії — відновлення з останньої успішно надісланої групи. Реалізовано через таблицю group_send_logs з ключем (task_id, group_id)."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 17 — Rate Limits
// ═══════════════════════════════════════════════════════════════
function Slide17({ lang }: SL) {
  return (
    <Shell>
      {title("⏱️", L(lang,"Rate Limits","Ліміти відправки"), ACCENT)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Per-account send speed is tracked with a sliding window to stay within Telegram's limits.",
          "Швидкість відправки на акаунт відстежується через ковзне вікно, щоб не перевищувати ліміти Telegram."
        )}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Visual indicators","Візуальні індикатори")}
        </div>
        {(lang === "ua" ? [
          {where:"Акаунти → карточка", what:"«Швидкість / хв»: прогрес-бар + X/Y + ↺Nс до скиду вікна"},
          {where:"Воркери → вгорі",   what:"«Всі акаунти»: мінi-смуга на кожен, оновлення 15 с"},
        ] : [
          {where:"Accounts → card",   what:"«Speed / min»: progress bar + X/Y counter + ↺Ns to window reset"},
          {where:"Workers → top",     what:"«All accounts»: mini bar per account, updates every 15 s"},
        ]).map(g => (
          <div key={g.where} style={{ marginBottom:9 }}>
            <div style={{ fontSize:11, fontWeight:700, color:ACCENT }}>{g.where}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2, lineHeight:1.45 }}>{g.what}</div>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          {[[GREEN,">50%",L(lang,"free","вільно")],[AMBER,"25–50%",L(lang,"moderate","помірно")],["#ef4444","<25%",L(lang,"critical","критично")]].map(([col,label,sub]) => (
            <div key={label} style={{ flex:1, textAlign:"center", borderRadius:8, padding:"6px 4px",
              background:`${col}14`, border:`1px solid ${col}28` }}>
              <div style={{ fontSize:11, color:col as string, fontWeight:700 }}>{label}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Limit parameters","Параметри лімітів")}
        </div>
        {[
          ["ACCOUNT_RATE_LIMIT_MAX","20",L(lang,"Messages per sliding window","Повідомлень за ковзне вікно")],
          ["ACCOUNT_RATE_LIMIT_WIN","60",L(lang,"Window length in seconds","Довжина вікна в секундах")],
        ].map(([k,v,d]) => (
          <div key={k} style={{ marginBottom:9 }}>
            <div style={{ fontSize:11, color:PURPLE, fontFamily:"monospace", marginBottom:2 }}>{k}={v}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{d}</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 18 — Best Practices
// ═══════════════════════════════════════════════════════════════
function Slide18({ lang }: SL) {
  const tips = lang === "ua" ? [
    {icon:"⏱️",color:AMBER,  tip:"Інтервали",  desc:"Мінімум 15–30 с між повідомленнями. FloodWait = акаунт тимчасово заблокований Telegram."},
    {icon:"🔀",color:GREEN,  tip:"Спінтакс",   desc:"Завжди використовуйте варіації — Telegram краще реагує на унікальні повідомлення."},
    {icon:"📱",color:ACCENT, tip:"Акаунти",    desc:"Для великих розсилок — кілька акаунтів + ротація. Один акаунт: ≤20 повідомлень/хв."},
    {icon:"🌐",color:PURPLE, tip:"Проксі",     desc:"Для акаунтів з різних регіонів — відповідні SOCKS5 проксі. Знижує ризик блокування."},
    {icon:"📊",color:PINK,   tip:"Моніторинг", desc:"Регулярно перевіряйте «Воркери» — crashed воркер потрібно перезапустити вручну."},
    {icon:"🔒",color:GREEN,  tip:"Сесії",      desc:"Зберігайте .session файли в безпеці. Їх витік = повний доступ до акаунта."},
  ] : [
    {icon:"⏱️",color:AMBER,  tip:"Intervals",  desc:"Minimum 15–30 s between messages. FloodWait = account temporarily restricted by Telegram."},
    {icon:"🔀",color:GREEN,  tip:"Spintax",    desc:"Always use text variations — Telegram handles unique messages much better."},
    {icon:"📱",color:ACCENT, tip:"Accounts",   desc:"For large broadcasts — multiple accounts + rotation. One account: ≤20 msg/min."},
    {icon:"🌐",color:PURPLE, tip:"Proxies",    desc:"Use matching SOCKS5 proxies per account region. Reduces ban risk significantly."},
    {icon:"📊",color:PINK,   tip:"Monitoring", desc:"Check Workers tab regularly — a crashed worker must be restarted manually."},
    {icon:"🔒",color:GREEN,  tip:"Sessions",   desc:"Keep .session files secure. Leaking them = full account access for anyone."},
  ];
  return (
    <Shell>
      {title("💡", L(lang,"Best Practices","Поради та рекомендації"), AMBER)}
      {tips.map(t => (
        <div key={t.tip} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:12, padding:"12px 13px" }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`${t.color}20`,
            border:`1.5px solid ${t.color}44`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:16, flexShrink:0 }}>{t.icon}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:t.color, marginBottom:2 }}>{t.tip}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.45 }}>{t.desc}</div>
          </div>
        </div>
      ))}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 19 — Architecture Overview  ★ Technical depth starts here
// ═══════════════════════════════════════════════════════════════
function Slide19({ lang }: SL) {
  const layers = lang === "ua" ? [
    {icon:"📱",color:ACCENT, name:"Mini App (React + Vite)",       desc:"Telegram WebApp iframe. Відображає UI, викликає /api/twa/* через HTTPS. Без прямого доступу до БД."},
    {icon:"🔧",color:GREEN,  name:"API Server (Node + Express)",   desc:"Порт 8080. Роздає статику Mini App та всі /api/* маршрути. Drizzle ORM + better-sqlite3."},
    {icon:"🤖",color:PURPLE, name:"Supervisor (Python)",           desc:"Порт 8083. Управляє міграціями БД, PTB-ботом, пулом воркерів та FastAPI auth proxy для Telethon."},
    {icon:"⚙️",color:AMBER,  name:"Workers (Python + Telethon)",   desc:"Беруть задачі з черги та надсилають через MTProto. Один воркер = один акаунт одночасно."},
    {icon:"🗄️",color:PINK,   name:"SQLite (campaigns.db)",        desc:"Єдина база даних. Всі сервіси читають/пишуть в один файл. Без зовнішнього DB-сервера."},
  ] : [
    {icon:"📱",color:ACCENT, name:"Mini App (React + Vite)",       desc:"Telegram WebApp iframe. Renders UI, calls /api/twa/* over HTTPS. No direct DB access."},
    {icon:"🔧",color:GREEN,  name:"API Server (Node + Express)",   desc:"Port 8080. Serves Mini App static files and all /api/* routes. Drizzle ORM + better-sqlite3."},
    {icon:"🤖",color:PURPLE, name:"Supervisor (Python)",           desc:"Port 8083. Manages DB migrations, PTB bot, worker pool and FastAPI auth proxy for Telethon."},
    {icon:"⚙️",color:AMBER,  name:"Workers (Python + Telethon)",   desc:"Claim tasks from queue and send via MTProto. One worker = one account at a time."},
    {icon:"🗄️",color:PINK,   name:"SQLite (campaigns.db)",        desc:"Single database file. All services read/write to it. No external DB server needed."},
  ];
  return (
    <Shell>
      {title("🏗️", L(lang,"Architecture","Архітектура"), BLUE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "PROMO-Fuel is a hybrid Node.js + Python system. Five layers communicating over HTTP and shared SQLite.",
          "PROMO-Fuel — гібридна Node.js + Python система. П'ять рівнів спілкуються через HTTP та спільний SQLite."
        )}
      </div>
      {layers.map(l => (
        <div key={l.name} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:11,
          background:GLASS, border:`1px solid ${l.color}2a`, borderRadius:13, padding:"12px 13px",
          boxShadow:`0 0 10px ${l.color}0e` }}>
          <div style={{ width:36, height:36, borderRadius:9, background:`${l.color}20`,
            border:`1.5px solid ${l.color}44`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:17, flexShrink:0 }}>{l.icon}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:l.color, marginBottom:3 }}>{l.name}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.54)", lineHeight:1.45 }}>{l.desc}</div>
          </div>
        </div>
      ))}
      <div style={card(BLUE)}>
        <div style={{ fontSize:12, color:BLUE, fontWeight:700, marginBottom:5 }}>
          {L(lang,"Request flow","Потік запитів")}
        </div>
        <code style={{ display:"block", fontSize:10, color:"rgba(255,255,255,0.65)", lineHeight:1.7,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:8, padding:"8px 10px" }}>
          {L(lang,
            "Telegram → Mini App (iframe)\n→ /api/twa/* (Node, HMAC auth)\n→ SQLite / Telethon proxy (port 8083)\n→ Worker task queue\n→ MTProto → Telegram servers",
            "Telegram → Mini App (iframe)\n→ /api/twa/* (Node, HMAC auth)\n→ SQLite / Telethon proxy (порт 8083)\n→ Черга задач воркерів\n→ MTProto → сервери Telegram"
          )}
        </code>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 20 — Telegram Protocols
// ═══════════════════════════════════════════════════════════════
function Slide20({ lang }: SL) {
  return (
    <Shell>
      {title("📡", L(lang,"Telegram Protocols","Протоколи Telegram"), PURPLE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The system uses two separate Telegram APIs, each serving a different purpose.",
          "Система використовує два різних API Telegram, кожен для своїх цілей."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:15, fontWeight:800, color:PURPLE, marginBottom:8 }}>MTProto · Telethon</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6, marginBottom:10 }}>
          {L(lang,
            "Binary protocol used by official Telegram clients. Operates at user-account level. Required for: sending messages to groups, fetching group lists, loading contacts, managing sessions and files.",
            "Бінарний протокол офіційних клієнтів Telegram. Рівень акаунта користувача. Потрібен для: надсилання повідомлень в групи, отримання списку груп, завантаження контактів, управління сесіями та файлами."
          )}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {["Telethon","MTProto","api_id","api_hash","session_file","SOCKS5","get_dialogs()","send_message()"].map(t => (
            <Tag key={t} color={PURPLE} label={t} />
          ))}
        </div>
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:15, fontWeight:800, color:ACCENT, marginBottom:8 }}>Bot API · python-telegram-bot</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6, marginBottom:10 }}>
          {L(lang,
            "REST API over HTTPS, operating at the bot level. Used for: receiving /inn and /broadcast commands, sending admin notifications, providing the Mini App launch button.",
            "REST API через HTTPS, рівень бота. Використовується для: отримання команд /inn та /broadcast, надсилання адмін-сповіщень, кнопки запуску Mini App."
          )}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {["python-telegram-bot","Bot API","TELEGRAM_TOKEN","Long-polling","sendMessage","InlineKeyboard"].map(t => (
            <Tag key={t} color={ACCENT} label={t} />
          ))}
        </div>
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:5 }}>
          {L(lang,"Critical difference","Ключова відмінність")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Bot API sends as a bot — cannot join groups freely, has strict sending limits, and content is clearly labeled as «bot». MTProto acts as a real user — can post in any group the account belongs to, indistinguishable from a normal user.",
            "Bot API надсилає від імені бота — не може вільно вступати в групи, має строгі ліміти, контент позначається як «bot». MTProto — реальний акаунт — може постити в будь-яку групу, де є учасником, не відрізняється від звичайного користувача."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 21 — Sessions & Security
// ═══════════════════════════════════════════════════════════════
function Slide21({ lang }: SL) {
  return (
    <Shell>
      {title("🔒", L(lang,"Sessions & Security","Сесії та безпека"), PINK)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Operational security of Telethon session management, proxy rotation, and API key protection.",
          "Операційна безпека: управління сесіями Telethon, ротація проксі та захист API-ключів."
        )}
      </div>
      <div style={card(PINK)}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Session files (.session)","Файли сесій (.session)")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Telethon stores auth state in an SQLite .session file. It contains the authorization key — a 256-byte secret negotiated via DH during first login. Losing it requires re-auth. Leaking it grants full account control. Never commit session files to version control.",
            "Telethon зберігає стан аутентифікації в SQLite .session файлі. Він містить ключ авторизації — 256-байтний секрет, узгоджений через DH при першому вході. Втрата → повторна авторизація. Витік → повний контроль над акаунтом. Ніколи не комітьте session-файли у VCS."
          )}
        </div>
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Proxy rotation","Ротація проксі")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "_rank_proxies() sorts proxies by failure count. Failure counts reset after PROXY_FAIL_WINDOW seconds. An account is marked proxy_failed when all proxies are exhausted. proxy_index persisted to DB after each rotation for crash recovery.",
            "_rank_proxies() сортує проксі за лічильником збоїв. Після PROXY_FAIL_WINDOW секунд лічильники скидаються. Акаунт позначається proxy_failed при вичерпанні всіх проксі. proxy_index зберігається в БД після кожної ротації."
          )}
        </div>
      </div>
      <div style={card(BLUE)}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"API route protection","Захист API-маршрутів")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "/api/* — Bearer token (API_SECRET env var). Only active when API_SECRET is set; skipped in dev.\n/api/twa/* — Telegram HMAC-SHA256 of initData, validated against TELEGRAM_TOKEN server-side. Prevents spoofed Mini App requests.",
            "/api/* — Bearer токен (env var API_SECRET). Активний лише при наявності API_SECRET; пропускається в dev.\n/api/twa/* — Telegram HMAC-SHA256 initData, перевіряється через TELEGRAM_TOKEN на сервері. Захист від підроблених запитів Mini App."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 22 — Spintax Engine Deep-Dive
// ═══════════════════════════════════════════════════════════════
function Slide22({ lang }: SL) {
  return (
    <Shell>
      {title("🔀", L(lang,"Spintax Engine","Рушій спінтаксу"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Spintax generates unique messages on every send to evade Telegram's duplicate-content detection.",
          "Спінтакс генерує унікальні повідомлення при кожному надсиланні для обходу детекції дублікатів Telegram."
        )}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Syntax examples","Приклади синтаксису")}
        </div>
        {[
          [L(lang,"Basic","Базовий"),   "{Hello|Hi|Hey} {friend|mate|buddy}!"],
          [L(lang,"Nested","Вкладений"),"{{Good morning|Morning}|Hello there}"],
          [L(lang,"With emoji","З емодзі"),"{🔥|⭐|💡} {Great|Awesome|Special} offer today!"],
        ].map(([label,ex]) => (
          <div key={label} style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, color:GREEN, fontWeight:700, marginBottom:4 }}>{label}</div>
            <code style={{ display:"block", background:GLASS2, border:`1px solid ${BORDER}`,
              borderRadius:8, padding:"8px 12px", fontSize:11, color:"#fff", lineHeight:1.6 }}>{ex}</code>
          </div>
        ))}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:6 }}>
          {L(lang,"How it works — lib/spintax.ts","Як це працює — lib/spintax.ts")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Recursive parser finds the innermost {a|b|c} groups first, randomly selects one branch, substitutes, then processes outer groups. Each spin() call produces an independent random combination. For N groups of average size K: K^N possible variations.",
            "Рекурсивний парсер знаходить найглибші групи {a|b|c}, випадково обирає одну гілку, підставляє, потім обробляє зовнішні групи. Кожен виклик spin() — незалежна випадкова комбінація. Для N груп середнього розміру K: K^N варіацій."
          )}
        </div>
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:4 }}>
          {L(lang,"⚠️ Anti-spam effectiveness","⚠️ Ефективність проти антиспаму")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Telegram's anti-spam flags batches of identical messages. Spintax + randomized delays are the two most effective mitigations. Use ≥4 variants per key phrase and ≥3 variants for the greeting/opening.",
            "Антиспам Telegram реагує на партії однакових повідомлень. Спінтакс + рандомізовані затримки — найефективніший захист. Використовуйте ≥4 варіанти на ключову фразу та ≥3 для привітання."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 23 — Supervisor & Worker Internals
// ═══════════════════════════════════════════════════════════════
function Slide23({ lang }: SL) {
  return (
    <Shell>
      {title("⚙️", L(lang,"Process Internals","Внутрішня будова процесів"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Deep look at the Python process management layer that runs and recovers broadcasts.",
          "Детальний огляд шару управління Python-процесами, що виконують та відновлюють розсилки."
        )}
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:13, fontWeight:800, color:AMBER, marginBottom:6 }}>supervisor.py — ProcessManager</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Spawns and monitors child processes (worker.py × N, apiserver.py). Crash handling: exponential backoff 5s→10s→20s→40s→80s. MAX_CRASHES=5 then stops with Telegram alert. Shutdown: SIGTERM → grace period → SIGKILL escalation. Uses event.wait() (not sleep) for responsive signal handling.",
            "Запускає та моніторить дочірні процеси (worker.py × N, apiserver.py). Обробка збоїв: бекоф 5с→10с→20с→40с→80с. MAX_CRASHES=5 → зупинка зі сповіщенням у Telegram. Завершення: SIGTERM → grace period → SIGKILL. Використовує event.wait() (не sleep) для чуйної обробки сигналів."
          )}
        </div>
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:800, color:PURPLE, marginBottom:6 }}>worker.py — Task Lifecycle</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "① claim_task_sync() — SQL UPDATE with WHERE locked_by IS NULL (atomic claim). ② Connect via Telethon + proxy. ③ run_account_preflight() — get_me() ban/session-revoke check with 15-min in-memory cache. ④ Run groupbroadcaster. ⑤ Update task status. Heartbeat every 30 s to worker_registry. Force-releases lock on crash via force_release_worker_sync().",
            "① claim_task_sync() — SQL UPDATE з WHERE locked_by IS NULL (атомарне захоплення). ② Підключення через Telethon + проксі. ③ run_account_preflight() — перевірка get_me() на бан/відкликання сесії з 15-хв кешем. ④ Запуск groupbroadcaster. ⑤ Оновлення статусу задачі. Heartbeat кожні 30 с у worker_registry. Примусово звільняє блокування при падінні через force_release_worker_sync()."
          )}
        </div>
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:800, color:GREEN, marginBottom:6 }}>groupbroadcaster.py — Send Loop</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "Iterates group list. Checks group_send_logs for resume cursor (skips already-sent). Calls client.send_message(). Logs result. Sleeps send_delay_seconds. Catches: FloodWaitError → waits exact seconds, UserBannedInChannelError → marks account banned, consecutive_errors[0] ≥5 → aborts task.",
            "Ітерується по списку груп. Перевіряє group_send_logs для курсора (пропускає вже відправлені). Викликає client.send_message(). Логує результат. Чекає send_delay_seconds. Ловить: FloodWaitError → чекає точну кількість секунд, UserBannedInChannelError → позначає акаунт banned, consecutive_errors[0] ≥5 → перериває задачу."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 24 — Database & API Schema
// ═══════════════════════════════════════════════════════════════
function Slide24({ lang }: SL) {
  const tables = [
    {name:"campaigns",         color:ACCENT,  desc:L(lang,"DM campaigns: name, text, account, audience, status, scheduled_at","DM-кампанії: назва, текст, акаунт, аудиторія, статус, scheduled_at")},
    {name:"sender_accounts",   color:GREEN,   desc:L(lang,"TG accounts: phone, api_id, api_hash, proxy_list, session_file, daily_limit","TG-акаунти: телефон, api_id, api_hash, proxy_list, session_file, ліміт")},
    {name:"users",             color:PINK,    desc:L(lang,"Audience: chat_id, username, first_name, last_name, tags","Аудиторія: chat_id, username, first_name, last_name, теги")},
    {name:"task_queue",        color:PURPLE,  desc:L(lang,"Broadcast jobs: status, worker_id, attempts, locked_by, payload","Задачі: статус, worker_id, спроби, locked_by, payload")},
    {name:"groupcampaigns",    color:AMBER,   desc:L(lang,"Group campaigns: account, message, interval, repeat_hours","Групові кампанії: акаунт, текст, інтервал, repeat_hours")},
    {name:"group_send_logs",   color:GREEN,   desc:L(lang,"Per-group log: task_id + group_id resume cursor, status, error","Лог по групах: task_id + group_id, курсор, статус, помилка")},
    {name:"worker_registry",   color:BLUE,    desc:L(lang,"Worker heartbeats, crash counts, locked_by, last_seen","Heartbeat воркерів, лічильники падінь, locked_by, last_seen")},
    {name:"message_templates", color:PINK,    desc:L(lang,"Reusable templates with spintax support","Шаблони повідомлень з підтримкою спінтаксу")},
  ];
  return (
    <Shell>
      {title("🗄️", L(lang,"Database & API Schema","Схема БД та API"), BLUE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:12, lineHeight:1.5 }}>
        {L(lang,
          "SQLite schema (campaigns.db) — 8 core tables. REST API at /api/* (Node) and /api/twa/* (Telegram-authed).",
          "Схема SQLite (campaigns.db) — 8 основних таблиць. REST API /api/* (Node) та /api/twa/* (Telegram-auth)."
        )}
      </div>
      {tables.map(t => (
        <div key={t.name} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:7,
          background:GLASS, border:`1px solid ${t.color}28`, borderRadius:10, padding:"8px 11px" }}>
          <code style={{ fontSize:10, fontWeight:700, color:t.color, minWidth:128, flexShrink:0,
            fontFamily:"monospace", paddingTop:1 }}>{t.name}</code>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{t.desc}</div>
        </div>
      ))}
      <div style={{ ...card(BLUE), marginTop:4 }}>
        <div style={{ fontSize:12, color:BLUE, fontWeight:700, marginBottom:5 }}>
          {L(lang,"Auth model","Модель аутентифікації")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
          {L(lang,
            "/api/* → Bearer token (API_SECRET). Active only when env var is set.\n/api/twa/* → HMAC-SHA256(initData, TELEGRAM_TOKEN). Validated server-side — prevents client-side spoofing.\nDev mode: both checks skipped for local development.",
            "/api/* → Bearer токен (API_SECRET). Активний лише при наявності env var.\n/api/twa/* → HMAC-SHA256(initData, TELEGRAM_TOKEN). Перевіряється сервером — захист від підробки на клієнті.\nDev-режим: обидві перевірки пропускаються."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 25 — Launch Checklist
// ═══════════════════════════════════════════════════════════════
function Slide25({ lang }: SL) {
  const checklist = lang === "ua" ? [
    "✅ api_id + api_hash отримано на my.telegram.org",
    "✅ Хоча б один акаунт доданий та авторизований (статус idle)",
    "✅ Воркер запущений і в статусі idle або running",
    "✅ Список груп завантажено (кнопка «Оновити»)",
    "✅ Шаблон повідомлення зі спінтаксом готовий",
    "✅ Групова або DM-кампанія створена та активована",
    "✅ Моніторинг: вкладки Стат + Воркери відкриті",
  ] : [
    "✅ api_id + api_hash obtained from my.telegram.org",
    "✅ At least one account added and authorized (status idle)",
    "✅ Worker running in idle or running status",
    "✅ Group list loaded (Refresh button clicked)",
    "✅ Message template with spintax ready",
    "✅ Group or DM campaign created and activated",
    "✅ Monitoring: Stats + Workers tabs open",
  ];
  return (
    <Shell style={{ alignItems:"center", justifyContent:"center", textAlign:"center" }}>
      <div style={{ fontSize:50, marginBottom:14 }}>🚀</div>
      <div style={{ fontSize:24, fontWeight:900, color:"#fff", letterSpacing:-0.8, marginBottom:6 }}>
        {L(lang,"Ready to launch!","Готово до роботи!")}
      </div>
      <div style={{ fontSize:13, color:ACCENT, fontWeight:600, marginBottom:20 }}>
        PROMO-Fuel {L(lang,"configured and running","налаштований та запущений")}
      </div>
      <div style={{ ...card(GREEN), width:"100%", textAlign:"left", marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:8 }}>
          {L(lang,"Launch checklist","Чеклист запуску")}
        </div>
        {checklist.map((item,i) => (
          <div key={i} style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginBottom:5 }}>{item}</div>
        ))}
      </div>
      <div style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:13,
        padding:"13px 16px", width:"100%", textAlign:"left" }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginBottom:5 }}>
          {L(lang,"Configuration","Конфігурація")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", lineHeight:1.7 }}>
          🔧 API Server: port 8080{"\n"}
          🤖 Supervisor: port 8083{"\n"}
          📱 Mini App: port 3000 (dev){"\n"}
          🗄️ Database: campaigns.db (SQLite)
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide registry
// ═══════════════════════════════════════════════════════════════
const SLIDES: Array<(p: SL) => React.ReactElement> = [
  Slide1,Slide2,Slide3,Slide4,Slide5,Slide6,Slide7,Slide8,Slide9,
  Slide10,Slide11,Slide12,Slide13,Slide14,Slide15,Slide16,Slide17,
  Slide18,Slide19,Slide20,Slide21,Slide22,Slide23,Slide24,Slide25,
];
const TOTAL = SLIDES.length;

const TITLES: Record<Lang, string[]> = {
  en: [
    "Cover","System Overview","Dashboard","Quick Actions","DM Campaigns",
    "Campaign Editor","Groups","Group Broadcasts","Campaign Settings",
    "Step-by-Step Walkthrough","Analytics","Audience","Sender Accounts",
    "Account Authorization","Workers","Task Queue","Rate Limits",
    "Best Practices","Architecture","Telegram Protocols",
    "Sessions & Security","Spintax Engine","Process Internals",
    "Database & API","Launch Checklist",
  ],
  ua: [
    "Обкладинка","Огляд системи","Дашборд","Швидкі дії","DM-розсилки",
    "Редактор кампанії","Групи","Групові розсилки","Налаштування кампанії",
    "Покрокове керівництво","Статистика","Аудиторія","Sender-акаунти",
    "Авторизація акаунта","Воркери","Черга задач","Ліміти відправки",
    "Поради та рекомендації","Архітектура","Протоколи Telegram",
    "Сесії та безпека","Рушій спінтаксу","Внутрішня будова процесів",
    "База даних та API","Чеклист запуску",
  ],
};

// ═══════════════════════════════════════════════════════════════
// ManualPage shell
// ═══════════════════════════════════════════════════════════════
export function ManualPage({ onClose }: Props) {
  const { lang } = useI18n();
  const [current, setCurrent] = useState(0);
  const touchX = useRef(0);
  const touchY = useRef(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(TOTAL - 1, c + 1)), []);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchY.current);
    if (Math.abs(dx) > 48 && dy < 60) { if (dx < 0) next(); else prev(); }
  }

  const SlideComp = SLIDES[current]!;
  const titles = TITLES[lang];

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:200, background:BG,
        display:"flex", flexDirection:"column", userSelect:"none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"13px 18px 7px", borderBottom:`1px solid ${BORDER}`,
        background:"rgba(7,9,15,0.82)", backdropFilter:"blur(16px)",
        flexShrink:0, zIndex:2 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)", letterSpacing:-0.2 }}>
            {titles[current]}
          </div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:1 }}>
            {current + 1} / {TOTAL}
            {current >= 18 && (
              <span style={{ marginLeft:6, fontSize:9, color:PURPLE, fontWeight:700, background:`${PURPLE}18`,
                border:`1px solid ${PURPLE}33`, borderRadius:4, padding:"1px 5px" }}>
                {L(lang,"ADVANCED","ADVANCED")}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ background:GLASS2, border:`1px solid ${BORDER2}`,
          borderRadius:10, width:33, height:33, display:"flex", alignItems:"center",
          justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:15, cursor:"pointer" }}>✕</button>
      </div>

      {/* Slide area */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(170deg,${BG} 0%,#0b1020 40%,${BG} 100%)` }} />
          <div style={{ position:"absolute", top:-160, left:-80, width:380, height:380, borderRadius:"50%",
            background:`radial-gradient(circle,${ACCENT}18 0%,transparent 68%)` }} />
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

        <div style={{ flex:1, display:"flex", justifyContent:"center", gap:4, flexWrap:"wrap" }}>
          {SLIDES.map((_,i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width:i===current ? 18 : 5, height:5, borderRadius:3,
              background:i===current ? ACCENT : i>=18 ? `${PURPLE}55` : "rgba(255,255,255,0.16)",
              border:"none", padding:0, cursor:"pointer",
              transition:"all 0.2s", flexShrink:0,
            }} />
          ))}
        </div>

        <button onClick={current===TOTAL-1 ? onClose : next}
          style={{ background:current===TOTAL-1
            ? `linear-gradient(135deg,${GREEN},${ACCENT})`
            : `linear-gradient(135deg,${ACCENT},${PURPLE})`,
            border:"none", borderRadius:11, padding:"9px 16px", fontSize:13,
            color:"#fff", fontWeight:700, cursor:"pointer",
            boxShadow:`0 0 14px ${ACCENT}3a`, flexShrink:0 }}>
          {current===TOTAL-1 ? L(lang,"✓ Close","✓ Закрити") : L(lang,"Next →","Далі →")}
        </button>
      </div>
    </div>
  );
}
