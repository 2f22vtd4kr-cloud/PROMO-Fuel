import { useState, useRef, useCallback } from "react";
import { useI18n } from "../lib/i18n";
import type { Lang } from "../lib/translations";

interface Props { onClose: () => void; onOpenAccountsGuide?: () => void }
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
function Slide1({ lang, onOpenAccountsGuide }: SL & { onOpenAccountsGuide?: () => void }) {
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
        {L(lang,"Complete system reference · 31 pages","Повний опис системи · 31 сторінка")}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginBottom:24 }}>
        {topics.map(([ic,lb]) => (
          <div key={lb} style={{ background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11,
            padding:"8px 12px", fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
            display:"flex", alignItems:"center", gap:5 }}><span>{ic}</span><span>{lb}</span></div>
        ))}
      </div>

      {/* Second guide tile */}
      {onOpenAccountsGuide && (
        <div
          onClick={onOpenAccountsGuide}
          style={{
            width:"100%", background:`linear-gradient(135deg,rgba(168,85,247,0.14) 0%,rgba(45,232,151,0.10) 100%)`,
            border:`1px solid rgba(168,85,247,0.35)`, borderRadius:16,
            padding:"14px 18px", cursor:"pointer", textAlign:"left", marginBottom:16,
            boxShadow:"0 0 20px rgba(168,85,247,0.15)",
            display:"flex", alignItems:"center", gap:14,
          }}
        >
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
            background:"linear-gradient(135deg,rgba(168,85,247,0.28),rgba(45,232,151,0.18))",
            border:"1.5px solid rgba(168,85,247,0.5)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
            boxShadow:"0 0 16px rgba(168,85,247,0.3)" }}>🔐</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#fff", marginBottom:3 }}>
              {L(lang,"Accounts & Proxy Guide","Гід: Акаунти та проксі")}
            </div>
            <div style={{ fontSize:11, color:"rgba(200,180,255,0.65)", lineHeight:1.4 }}>
              {L(lang,
                "Session import, proxy setup, anti-ban protocols",
                "Імпорт сесій, налаштування проксі, антибан"
              )}
            </div>
          </div>
          <div style={{ fontSize:18, color:"rgba(168,85,247,0.7)", flexShrink:0 }}>›</div>
        </div>
      )}

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
// SLIDE — Bulk Account Import (inserted after Slide13)
// ═══════════════════════════════════════════════════════════════
function SlideAccountsBulk({ lang }: SL) {
  return (
    <Shell>
      {title("📦", L(lang,"Bulk Account Import","Масовий імпорт акаунтів"), PURPLE)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Import dozens of session files at once with a single ZIP archive — no manual entry needed.",
          "Завантажте десятки сесійних файлів одразу через ZIP-архів — без ручного вводу."
        )}
      </div>
      <div style={card(PURPLE)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Archive format","Формат архіву")}
        </div>
        {[
          [L(lang,"session files","файли сесій"),    L(lang,"*.session  — Telethon sessions","*.session  — Telethon-сесії")],
          [L(lang,"proxy list","список проксі"),     "proxies.txt  — socks5://user:pass@host:port"],
          [L(lang,"credentials","облікові дані"),    "credentials.json  — {phone, api_id, api_hash}"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"baseline" }}>
            <span style={{ fontSize:11, fontWeight:700, color:PURPLE, minWidth:90 }}>{k}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontFamily:"monospace" }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"How to use","Як використовувати")}
        </div>
        {[
          [1, GREEN,  L(lang,"Accounts tab → 📦 Bulk","Вкладка «Акаунти» → 📦 Bulk")],
          [2, ACCENT, L(lang,"Upload ZIP archive","Завантажте ZIP-архів")],
          [3, AMBER,  L(lang,"Paste proxy list (optional)","Вставте список проксі (опційно)")],
          [4, GREEN,  L(lang,"Click Import — done!","Натисніть «Імпорт» — готово!")],
        ].map(([n,c,d]) => step(n as number, c as string, d as string, ""))}
      </div>
      <div style={{ ...card(AMBER), marginTop:2 }}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:4 }}>💡</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Proxies are matched to sessions in order. Duplicate phones are automatically skipped.",
            "Проксі призначаються сесіям по порядку. Дублікати телефонів пропускаються автоматично."
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
// SLIDE — Proxy Health Check (inserted after Slide14)
// ═══════════════════════════════════════════════════════════════
function SlideProxyHealth({ lang }: SL) {
  return (
    <Shell>
      {title("🔌", L(lang,"Proxy Health Check","Перевірка проксі"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Ping each account's SOCKS5 proxy to verify it can reach Telegram's servers before you start a campaign.",
          "Перевіряйте SOCKS5-проксі кожного акаунта — чи можуть вони дістатися серверів Telegram до початку розсилки."
        )}
      </div>
      <div style={card(GREEN)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Ping badge","Бейдж Ping")}
        </div>
        {[
          ["🔌 Ping",           L(lang,"Idle — tap to test the proxy","В очікуванні — натисніть для перевірки")],
          ["⏳ …",              L(lang,"Handshaking with Telegram DC2","Підключення до Telegram DC2")],
          [`⚡ <ms>ms`,         L(lang,"Live — colour shows latency","Живий — колір відображає затримку")],
          ["✗ dead",            L(lang,"Cannot reach Telegram — replace proxy","Немає доступу до Telegram — замінити проксі")],
          ["no proxy",          L(lang,"No SOCKS5 proxy configured","SOCKS5-проксі не налаштовано")],
        ].map(([badge, desc]) => (
          <div key={badge as string} style={{ display:"flex", gap:10, alignItems:"baseline", marginBottom:7 }}>
            <code style={{ fontSize:11, color:GREEN, fontFamily:"monospace", minWidth:78 }}>{badge as string}</code>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{desc as string}</span>
          </div>
        ))}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Latency colour guide","Кольорова шкала затримки")}
        </div>
        {[
          ["< 200 ms", "#2de897", L(lang,"Excellent","Відмінно")],
          ["200–500 ms", "#ffc946", L(lang,"Acceptable","Прийнятно")],
          ["> 500 ms",  "#ff6b7a", L(lang,"Slow — consider replacing","Повільно — варто замінити")],
        ].map(([range, col, label]) => (
          <div key={range as string} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:800, color:col as string, minWidth:72 }}>{range as string}</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{label as string}</span>
          </div>
        ))}
      </div>
      <div style={{ ...card(PINK), marginTop:2 }}>
        <div style={{ fontSize:12, color:PINK, fontWeight:700, marginBottom:4 }}>
          {L(lang,"Tip","Порада")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "Tap the badge again after a test to reset it and re-ping.",
            "Натисніть бейдж ще раз після перевірки, щоб скинути результат і перевірити знову."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE — Auto-Revalidation (inserted after SlideProxyHealth)
// ═══════════════════════════════════════════════════════════════
function SlideAutoRevalidation({ lang }: SL) {
  return (
    <Shell>
      {title("🔄", L(lang,"Auto-Revalidation","Авто-реvalidація"), ACCENT)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The supervisor daemon automatically re-validates all sessions every 6 hours and alerts you when any expire.",
          "Демон supervisor автоматично перевіряє всі сесії кожні 6 годин і сповіщає, коли якась із них протерміновує."
        )}
      </div>
      <div style={card(ACCENT)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"How it works","Як це працює")}
        </div>
        {[
          [1, ACCENT, L(lang,"Every 6 h (configurable)","Кожні 6 год (налаштовується)"),
            L(lang,"Runs validate_sessions.py on all active accounts","Запускає validate_sessions.py для всіх активних акаунтів")],
          [2, GREEN,  L(lang,"Session OK","Сесія OK"),
            L(lang,"Status stays 'authorized' — no alert","Статус залишається 'authorized' — без сповіщення")],
          [3, AMBER,  L(lang,"Session expired","Сесія протермінована"),
            L(lang,"Status → 'session_invalid' — Telegram alert to owner","Статус → 'session_invalid' — сповіщення власнику в Telegram")],
          [4, PURPLE, L(lang,"Account recovered","Акаунт відновлений"),
            L(lang,"If re-authed between checks — logged as 'recovered'","Якщо повторно авторизовано — логується як 'відновлено'")],
        ].map(([n,c,t,d]) => step(n as number, c as string, t as string, d as string))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
        {[
          ["REVALIDATE_INTERVAL_HOURS", "6",  L(lang,"Check interval (hours)","Інтервал перевірки (годин)")],
          ["REVALIDATE_MAX_BATCH",      "20", L(lang,"Max accounts per pass","Макс. акаунтів за прохід")],
        ].map(([k,v,d]) => (
          <div key={k as string} style={{ ...card(PURPLE), marginTop:0, display:"flex", gap:8, alignItems:"baseline", flexWrap:"wrap" }}>
            <code style={{ fontSize:10, color:PURPLE, fontFamily:"monospace", minWidth:200 }}>{k as string}</code>
            <span style={{ fontSize:11, color:GREEN, fontWeight:700 }}>=&nbsp;{v as string}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{d as string}</span>
          </div>
        ))}
      </div>
      <div style={{ ...card(AMBER), marginTop:4 }}>
        <div style={{ fontSize:12, color:AMBER, fontWeight:700, marginBottom:4 }}>💡</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
          {L(lang,
            "You can also trigger a manual check from the Accounts tab → 🔬 Validate (N) button.",
            "Ви також можете запустити ручну перевірку з вкладки Акаунти → кнопка 🔬 Validate (N)."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE — Account Tools (Export & Utilities)
// ═══════════════════════════════════════════════════════════════
function SlideAccountTools({ lang }: SL) {
  return (
    <Shell>
      {title("🛠", L(lang,"Account Tools","Інструменти акаунтів"), GREEN)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "Quick-action tools in the Accounts header for managing your sender fleet.",
          "Інструменти швидкої дії в заголовку Акаунтів для управління відправниками."
        )}
      </div>
      <div style={card(GREEN)}>
        {[
          ["🔬 Validate (N)", ACCENT,    L(lang,"Primary — appears when N accounts have invalid sessions; re-checks them all via Telethon","Основна — з'являється коли N акаунтів мають невалідні сесії; перевіряє їх через Telethon")],
          ["🔄 Reval All",    PURPLE,    L(lang,"Primary — revalidates every active session in one batch","Основна — перевіряє кожну активну сесію пакетом")],
          ["··· (overflow)",  "#6ba8e5", L(lang,"Tap to expand secondary tools: Bulk Proxy, Bulk Import, Ping All, CSV Export, Reset Counts","Натисніть щоб відкрити вторинні інструменти: Bulk Proxy, Bulk Import, Ping All, CSV Export, Скид")],
          ["🌐 Bulk Proxy",   "#6ba8e5", L(lang,"(inside ···) Assign a proxy list to all accounts at once","(у ···) Призначити список проксі всім акаунтам одразу")],
          ["📦 Bulk Import",  AMBER,     L(lang,"(inside ···) Opens the bulk ZIP importer for mass session upload","(у ···) Відкриває масовий ZIP-імпортер для завантаження сесій")],
          ["🔌 Ping All",     GREEN,     L(lang,"(inside ···) Pings every SOCKS5 proxy — coloured latency badges appear on each card","(у ···) Пінгує всі SOCKS5 проксі — кольорові бейджі затримки з'являються на картках")],
          ["📥 CSV",          "#7c8db0", L(lang,"(inside ···) Downloads all accounts as a spreadsheet","(у ···) Завантажує всі акаунти як таблицю")],
          ["🔁 Reset Counts", "#7c8db0", L(lang,"(inside ···) Resets all accounts' sent_today counter to zero","(у ···) Скидає лічильник sent_today до нуля для всіх акаунтів")],
        ].map(([btn,col,desc]) => (
          <div key={btn as string} style={{ display:"flex", gap:10, alignItems:"baseline", marginBottom:10 }}>
            <code style={{ fontSize:11, color:col as string, fontFamily:"monospace", minWidth:96, whiteSpace:"nowrap" }}>{btn as string}</code>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{desc as string}</span>
          </div>
        ))}
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:8 }}>
          {L(lang,"Account pipeline","Конвеєр акаунтів")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:2 }}>
          {L(lang,
            "📦 Bulk import → 🔬 Validate → 🔌 Ping proxy → 🔑 Auth (if needed) → ✅ idle",
            "📦 Масовий імпорт → 🔬 Перевірка → 🔌 Пінг проксі → 🔑 Авторизація (якщо треба) → ✅ idle"
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
      <div style={card(ACCENT)}>
        <div style={{ fontSize:12, color:ACCENT, fontWeight:700, marginBottom:4 }}>
          {L(lang,"ℹ️ Worker Info Panel","ℹ️ Панель інформації воркера")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.58)", lineHeight:1.55 }}>
          {L(lang,
            "Tap the ℹ button on any worker card to open the full info panel: live heartbeat bar, vitals grid, linked account details, task list, crash history, and session info.",
            "Натисніть ℹ на картці воркера — відкриється повна панель: живий heartbeat, метрики, деталі акаунту, задачі, історія крешів, інформація про сесію."
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
// SLIDE — Monitoring & Alerts
// ═══════════════════════════════════════════════════════════════
function SlideMonitoring({ lang }: SL) {
  return (
    <Shell>
      {title("🔔", L(lang,"Monitoring & Alerts","Моніторинг і сповіщення"), AMBER)}
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginBottom:14, lineHeight:1.5 }}>
        {L(lang,
          "The supervisor sends proactive Telegram alerts so you know about issues before they impact campaigns.",
          "Supervisor надсилає проактивні Telegram-сповіщення, щоб ви знали про проблеми до того, як вони вплинуть на кампанії."
        )}
      </div>
      <div style={card(AMBER)}>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:10 }}>
          {L(lang,"Automatic alerts","Автоматичні сповіщення")}
        </div>
        {[
          ["⚠️", AMBER,  L(lang,"Worker crash","Воркер впав"),            L(lang,"1st crash fires immediately; subsequent within 15 min window suppressed","Перший краш — негайно; наступні в межах 15 хв — подавляються")],
          ["☠️", "#ff6b7a", L(lang,"Worker dead","Воркер мертвий"),         L(lang,"After 5 crashes in 10 min — process not restarted","Після 5 крашів за 10 хв — процес не перезапускається")],
          ["🔑", ACCENT,  L(lang,"Session expired","Сесія протермінована"),  L(lang,"Auto-revalidation every 6h detects newly invalid sessions","Авто-реvalіdація кожні 6 год знаходить невалідні сесії")],
          ["🐢", GREEN,   L(lang,"Silent hour","Тихий час"),                 L(lang,"Active campaigns sent 0 messages in the last hour","Активні кампанії надіслали 0 повідомлень за годину")],
          ["📊", PURPLE,  L(lang,"Quota warning","Попередження ліміту"),     L(lang,"Any sender account reaches ≥90% of daily limit","Будь-який акаунт досяг ≥90% денного ліміту")],
          ["📊", "#6b7280", L(lang,"Daily digest","Щоденний звіт"),          L(lang,"Every day at 09:00 UTC — summary of sends, workers, users","Щодня о 09:00 UTC — підсумок відправок, воркерів, юзерів")],
          ["📈", "#6b7280", L(lang,"Weekly digest","Тижневий звіт"),         L(lang,"Sundays at 19:00 UTC — 7-day aggregated report","Неділя 19:00 UTC — агрегований звіт за 7 днів")],
        ].map(([ic,c,t,d]) => (
          <div key={t as string} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
            <span style={{ fontSize:16, minWidth:24 }}>{ic as string}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:c as string, marginBottom:2 }}>{t as string}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.4 }}>{d as string}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...card(GREEN), marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>
          {L(lang,"Configurable via env vars","Налаштовується через env vars")}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {[
            ["DAILY_SUMMARY_HOUR",       "9",  L(lang,"Daily digest hour (UTC)","Година щоденного звіту UTC")],
            ["WEEKLY_SUMMARY_WEEKDAY",   "6",  L(lang,"Weekly weekday (0=Mon, 6=Sun)","День тижня (0=Пн, 6=Нд)")],
            ["REVALIDATE_INTERVAL_HOURS","6",  L(lang,"Session check interval","Інтервал перевірки сесій")],
          ].map(([k,v,d]) => (
            <div key={k as string} style={{ display:"flex", gap:6, alignItems:"baseline", flexWrap:"wrap" }}>
              <code style={{ fontSize:9, color:PURPLE, fontFamily:"monospace" }}>{k as string}</code>
              <span style={{ fontSize:10, color:GREEN, fontWeight:700 }}>={v as string}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{d as string}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide — New Features (bell panel, toasts, search, fleet health)
// ═══════════════════════════════════════════════════════════════
function SlideNewFeatures({ lang }: SL) {
  const features = [
    {
      icon: "🔔",
      title: L(lang,"Bell Status Panel","Панель статусу (🔔)"),
      desc:  L(lang,
        "Tap the bell icon on the Home screen to see live platform health: active workers, running campaigns, quota used today, banned/flood accounts.",
        "Натисніть 🔔 на головному екрані — побачите живий стан платформи: воркери, кампанії, квоту, заблоковані акаунти.",
      ),
    },
    {
      icon: "📣",
      title: L(lang,"Campaign Completion Toasts","Сповіщення про завершення кампаній"),
      desc:  L(lang,
        "When a campaign changes status — started (🚀), completed (✅), or cancelled (⛔) — a toast notification pops up automatically, even while browsing other tabs.",
        "При зміні статусу кампанії — запущено (🚀), завершено (✅), скасовано (⛔) — автоматично з'являється сповіщення на будь-якій вкладці.",
      ),
    },
    {
      icon: "📡",
      title: L(lang,"Group Broadcast Toasts","Сповіщення групових розсилок"),
      desc:  L(lang,
        "Group broadcasts also fire toasts: 📡 live, ✅ done, ⏹ stopped. Works in real time from SSE stream.",
        "Групові розсилки також надсилають сповіщення: 📡 запущена, ✅ завершена, ⏹ зупинена — через SSE.",
      ),
    },
    {
      icon: "🔍",
      title: L(lang,"Manual Slide Search","Пошук по слайдах довідника"),
      desc:  L(lang,
        "Tap 🔍 in the top bar of this manual to search across all 33 slide titles and keywords. Tap a result to jump directly to that slide.",
        "Натисніть 🔍 у верхній панелі довідника для пошуку по всіх 33 слайдах. Торкніться результату — одразу перейдете до слайда.",
      ),
    },
    {
      icon: "💙",
      title: L(lang,"Fleet Health Score","Здоров'я флоту акаунтів"),
      desc:  L(lang,
        "The Accounts header now shows a fleet health %. Green bar = ≥90% of accounts healthy. Yellow = degraded. Red = critical. Unhealthy = banned + session_invalid + proxy_failed.",
        "У заголовку Акаунтів відображається % здоров'я флоту. Зелена смуга ≥90%. Жовта — деградація. Червона — критично. Нездорові = бан + невалідна сесія + проксі-помилка.",
      ),
    },
    {
      icon: "📊",
      title: L(lang,"Live Daily Digest","Живий лічильник за сьогодні"),
      desc:  L(lang,
        "The Home dashboard \"Sent today\" row updates live via SSE — shows DM sends + group sends combined, with a green pulse dot when the counter is updating.",
        "Рядок «Надіслано сьогодні» на дашборді оновлюється в реальному часі через SSE — сумує DM і групові розсилки, зі зеленою пульсуючою крапкою.",
      ),
    },
    {
      icon: "···",
      title: L(lang,"Accounts Overflow Toolbar","Кнопка ··· у акаунтах"),
      desc:  L(lang,
        "Secondary Accounts tools (Bulk Proxy, Bulk Import, Ping All, CSV Export, Reset Counts) are now hidden behind a ··· button — primary bar stays clean with just Validate and Reval All.",
        "Вторинні інструменти акаунтів (Bulk Proxy, Bulk Import, Ping All, CSV, Скид) сховані за кнопкою ··· — основна панель залишається чистою з Validate та Reval All.",
      ),
    },
    {
      icon: "🗑",
      title: L(lang,"Delete Confirmations","Підтвердження видалення"),
      desc:  L(lang,
        "Deleting a DM Campaign or Group Broadcast now requires double confirmation — tap Delete in the menu, then confirm in the modal to prevent accidental data loss.",
        "Видалення DM-кампанії або групової розсилки тепер потребує подвійного підтвердження — натисніть «Видалити» у меню, потім підтвердьте у модальному вікні.",
      ),
    },
    {
      icon: "ℹ",
      title: L(lang,"Worker Info Panel","Панель деталей воркера"),
      desc:  L(lang,
        "Tap ℹ on any Worker card to open a full-screen info panel: live heartbeat bar, vitals, linked account, active task, crash history, and session table.",
        "Натисніть ℹ на будь-якій картці воркера — відкривається повноекранна панель: heartbeat, метрики, акаунт, активна задача, історія крешів, таблиця сесій.",
      ),
    },
    {
      icon: "🗂",
      title: L(lang,"Campaign Archive","Архів кампаній"),
      desc:  L(lang,
        "DM campaigns can now be soft-deleted via ··· → Archive. They move to a dedicated 🗂 Архив tab and are hidden from all other views. Restore anytime via Unarchive.",
        "DM-кампанії можна архівувати через ··· → «В архів». Вони переходять у вкладку 🗂 Архів і зникають з усіх інших режимів. Відновити можна будь-коли через «Восстановить».",
      ),
    },
    {
      icon: "📊",
      title: L(lang,"Group Analytics Overlay","Аналітика групи"),
      desc:  L(lang,
        "In Group Broadcasts → Stats tab, tap any group row to open a full-screen analytics overlay: all-time delivery rate, FloodWait count, ban events, per-campaign breakdown, and a 30-day daily history chart.",
        "У розділі Group Broadcasts → вкладка Stats — натисніть на будь-яку групу, щоб відкрити аналітику: частота доставки, FloodWait, бани, деталі по кожній кампанії та 30-денна гістограма.",
      ),
    },
    {
      icon: "🪄",
      title: L(lang,"AI Spintax Generator","AI Генератор Спінтаксу"),
      desc:  L(lang,
        "New in the Campaign Editor: tap ✦ AI Spintax, enter a plain seed message, pick a tone (Casual / Professional / Direct), and hit Optimize with AI. Gemini 2.5 Flash generates a deeply nested spintax string with hundreds of unique permutations. Tap Regenerate to get a fresh variant instantly.",
        "Новинка в Редакторі кампанії: натисніть ✦ AI Спінтакс, введіть базове повідомлення, виберіть тон (Розмовний / Офіційний / Прямий) і натисніть «Оптимізувати з AI». Gemini 2.5 Flash генерує глибоко вкладений спінтакс із сотнями унікальних варіацій. Натисніть «Ще раз», щоб миттєво отримати новий варіант.",
      ),
    },
    {
      icon: "🤖",
      title: L(lang,"AI Autonomous Copilot","AI Автономний копілот"),
      desc:  L(lang,
        "The AI Assistant now runs in Autonomous Mode with 6 mutation tools (delete accounts, update proxies, pause/resume campaigns, trigger blasts). Every action requires your explicit approval via the Human-in-the-Loop gate before execution.",
        "AI Помічник тепер працює в автономному режимі з 6 інструментами мутації (видалення акаунтів, оновлення проксі, призупинення/відновлення кампаній, запуск бластів). Кожна дія потребує вашого явного підтвердження через вікно авторизації.",
      ),
    },
    {
      icon: "🕐",
      title: L(lang,"AI Action History Log","Журнал дій AI"),
      desc:  L(lang,
        "Tap the 🕐 clock icon in the AI Assistant header to open the action history log — a full audit trail of every approved and cancelled AI operation with timestamp, exact parameters, engine badge, and outcome.",
        "Натисніть 🕐 у заголовку AI Помічника, щоб відкрити журнал дій — повний аудит-лог кожної підтвердженої та скасованої операції AI з часом, параметрами, бейджем рушія та результатом.",
      ),
    },
  ];
  return (
    <Shell>
      <div style={{ textAlign:"center", marginBottom:14 }}>
        <div style={{ fontSize:28, marginBottom:4 }}>✨</div>
        <div style={{ fontSize:16, fontWeight:800, color:"rgba(255,255,255,0.9)" }}>{L(lang,"What's New","Нові функції")}</div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:3 }}>
          {L(lang,"Recently added features","Нещодавно додані можливості")}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
        {features.map(f => (
          <div key={f.icon} style={{ ...card(ACCENT), display:"flex", gap:11, alignItems:"flex-start" }}>
            <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{f.icon}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:ACCENT, marginBottom:3 }}>{f.title}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", lineHeight:1.5 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide — AI Copilot
// ═══════════════════════════════════════════════════════════════
function SlideAiCopilot({ lang }: SL) {
  return (
    <Shell>
      {title("🤖", L(lang,"AI Autonomous Copilot","AI Автономний копілот"), PURPLE)}

      <div style={{ ...card(PURPLE), marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:8 }}>
          {L(lang,"What it does","Що він робить")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>
          {L(lang,
            "PROMO-Fuel System Copilot runs in Autonomous Mode — it can read all platform data AND take real actions on your behalf. Powered by Gemini 2.5 Flash (primary) and Groq Llama (fallback).",
            "PROMO-Fuel System Copilot працює в автономному режимі — він може читати всі дані платформи І виконувати реальні дії. Основний рушій: Gemini 2.5 Flash, резерв: Groq Llama.",
          )}
        </div>
      </div>

      <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
        {L(lang,"6 Mutation Tools","6 Інструментів мутації")}
      </div>
      {[
        { icon:"🗑️", color:PINK,  name:"delete_restricted_accounts", label:L(lang,"Delete Banned Accounts","Видалення заблокованих"), desc:L(lang,"Permanently removes banned/restricted sender accounts by ID.","Остаточно видаляє заблоковані акаунти за ID.") },
        { icon:"🌐", color:BLUE,  name:"update_account_proxy",        label:L(lang,"Update Account Proxy","Оновити проксі акаунтів"), desc:L(lang,"Sets a new SOCKS5 proxy on a list of accounts.","Встановлює новий SOCKS5-проксі на список акаунтів.") },
        { icon:"🧹", color:GREEN, name:"remove_dead_proxies",          label:L(lang,"Remove Dead Proxies","Очистити мертві проксі"), desc:L(lang,"Clears proxy field on all proxy_failed accounts.","Очищає проксі на всіх акаунтах зі статусом proxy_failed.") },
        { icon:"⏸️", color:AMBER, name:"pause_active_campaign",        label:L(lang,"Pause Campaign","Призупинити кампанію"), desc:L(lang,"Pauses a currently running DM campaign.","Призупиняє запущену DM-кампанію.") },
        { icon:"▶️", color:GREEN, name:"resume_campaign",              label:L(lang,"Resume Campaign","Відновити кампанію"), desc:L(lang,"Resumes a paused DM campaign.","Відновлює призупинену DM-кампанію.") },
        { icon:"🚀", color:PINK,  name:"trigger_bulk_blast",           label:L(lang,"Trigger Bulk Blast","Запустити масовий бласт"), desc:L(lang,"Creates and immediately launches a new DM campaign.","Створює й одразу запускає нову DM-кампанію.") },
      ].map(t => (
        <div key={t.name} style={{ display:"flex", gap:11, alignItems:"flex-start", marginBottom:7,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11, padding:"9px 12px" }}>
          <div style={{ width:32, height:32, borderRadius:8, background:`${t.color}18`, border:`1.5px solid ${t.color}44`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{t.icon}</div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:t.color, marginBottom:1 }}>{t.label}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.42)", lineHeight:1.45 }}>{t.desc}</div>
          </div>
        </div>
      ))}

      <div style={{ ...card(AMBER), marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:AMBER, marginBottom:6 }}>
          🔒 {L(lang,"Human-in-the-Loop Gate","Вікно підтвердження дій")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.6 }}>
          {L(lang,
            "AI never executes mutations silently. When it wants to take action, it stops and shows an Authorization Card with the exact operation details. You tap Approve & Execute or Cancel — nothing runs without your explicit confirmation.",
            "AI ніколи не виконує мутації мовчки. Коли AI хоче вжити дію, воно зупиняється і показує картку авторизації з точними деталями операції. Ви натискаєте «Підтвердити та виконати» або «Скасувати» — нічого не запускається без вашого явного підтвердження.",
          )}
        </div>
      </div>

      <div style={{ ...card(ACCENT), marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:ACCENT, marginBottom:6 }}>
          🕐 {L(lang,"Action History Log","Журнал дій")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.6 }}>
          {L(lang,
            "Tap the clock icon (🕐) in the AI header to view a full audit trail of every action the AI proposed — approved ✓ or cancelled ✗, with exact parameters, timestamp, and engine badge. Persists across sessions. Holds up to 100 entries.",
            "Натисніть піктограму годинника (🕐) у заголовку AI, щоб переглянути повний журнал кожної запропонованої AI дії — підтверджена ✓ або скасована ✗, з точними параметрами, часом і бейджем рушія. Зберігається між сесіями. До 100 записів.",
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide — AI Spintax Generator
// ═══════════════════════════════════════════════════════════════
function SlideAiSpintax({ lang }: SL) {
  return (
    <Shell>
      {title("🪄", L(lang,"AI Spintax Generator","AI Генератор Спінтаксу"), PURPLE)}

      <div style={{ ...card(PURPLE), marginBottom:12 }}>
        <div style={{ fontSize:12, fontWeight:700, color:PURPLE, marginBottom:6 }}>
          {L(lang,"What it does","Що це таке")}
        </div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>
          {L(lang,
            "Type a plain message seed and the AI converts it into a deeply nested Spintax string with 6–10+ variation groups — producing hundreds of unique message permutations to evade Telegram's duplicate-content detection.",
            "Напишіть звичайне базове повідомлення, і AI перетворить його у глибоко вкладений Spintax-рядок із 6–10+ групами варіацій — сотні унікальних перестановок для обходу фільтрів дублікатів Telegram.",
          )}
        </div>
      </div>

      <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
        {L(lang,"How to use","Як використовувати")}
      </div>
      {[
        { n:1, color:BLUE,  en:"Open the Campaign Editor → tap ✦ AI Spintax to expand the panel.", ua:"Відкрийте Редактор кампанії → натисніть ✦ AI Спінтакс, щоб розгорнути панель." },
        { n:2, color:AMBER, en:"Choose a tone: Casual, Professional, or Direct.", ua:"Виберіть тон: Розмовний, Офіційний або Прямий." },
        { n:3, color:GREEN, en:"Type your plain base message in the seed text area.", ua:"Введіть звичайне базове повідомлення у поле введення." },
        { n:4, color:PINK,  en:"Tap «Optimize with AI» — Gemini 2.5 Flash generates the spintax. Falls back to Groq Llama if Gemini is at capacity.", ua:"Натисніть «Оптимізувати з AI» — Gemini 2.5 Flash генерує спінтакс. Якщо Gemini перевантажений — використовується Groq Llama." },
        { n:5, color:PURPLE,en:"The generated spintax fills the message template field and the preview expands automatically showing 3 sample variants.", ua:"Згенерований спінтакс заповнює поле шаблону повідомлення, а попередній перегляд автоматично розгортається з 3 варіантами." },
        { n:6, color:ACCENT,en:"Not satisfied? Tap «Regenerate» to get a fresh variation without clearing your seed text.", ua:"Не задоволені результатом? Натисніть «Ще раз», щоб отримати новий варіант без очищення базового тексту." },
      ].map(s => (
        <div key={s.n} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:7,
          background:GLASS, border:`1px solid ${BORDER}`, borderRadius:11, padding:"9px 12px" }}>
          <div style={{ width:22, height:22, borderRadius:7, background:`${s.color}18`, border:`1.5px solid ${s.color}55`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, color:s.color, flexShrink:0 }}>{s.n}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.5 }}>{L(lang,s.en,s.ua)}</div>
        </div>
      ))}

      <div style={{ ...card(GREEN), marginTop:4 }}>
        <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>
          🔀 {L(lang,"Tone Modes","Режими тону")}
        </div>
        {[
          { tone:L(lang,"Casual","Розмовний"),       desc:L(lang,"Conversational, warm, informal — contractions, emoji-friendly.","Розмовний, теплий, неформальний — скорочення, дружній тон.") },
          { tone:L(lang,"Professional","Офіційний"), desc:L(lang,"Clear, respectful, business-appropriate — formal grammar, no slang.","Чіткий, поважний, діловий — офіційна граматика, без сленгу.") },
          { tone:L(lang,"Direct","Прямий"),           desc:L(lang,"Concise, action-oriented — short punchy sentences, strong CTAs.","Лаконічний, орієнтований на дію — короткі речення, сильні заклики.") },
        ].map(m => (
          <div key={m.tone} style={{ display:"flex", gap:8, marginBottom:5, alignItems:"flex-start" }}>
            <span style={{ fontSize:11, fontWeight:800, color:GREEN, minWidth:80, flexShrink:0 }}>{m.tone}</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.50)", lineHeight:1.45 }}>{m.desc}</span>
          </div>
        ))}
      </div>

      <div style={{ ...card(BLUE), marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:BLUE, marginBottom:6 }}>
          📊 {L(lang,"Quality Badge","Бейдж якості")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.6, marginBottom:8 }}>
          {L(lang,
            "After generation (or any edit to the template), a quality bar appears automatically inside the AI panel showing three stats:",
            "Після генерації (або будь-якого редагування шаблону) у панелі AI автоматично з'являється рядок якості з трьома показниками:",
          )}
        </div>
        {[
          { icon:"🔀", color:PURPLE, label:L(lang,"N groups","N груп"),       desc:L(lang,"Total number of {…} variation groups in the template.","Загальна кількість груп варіацій {…} у шаблоні.") },
          { icon:"✨", color:AMBER,  label:L(lang,"~N combos","~N варіацій"), desc:L(lang,"Estimated unique message permutations — product of all group option counts.","Орієнтовна кількість унікальних перестановок повідомлень — добуток варіантів усіх груп.") },
          { icon:"✓",  color:GREEN,  label:L(lang,"Valid / ✗ Bracket error","Валідний / ✗ Помилка дужок"), desc:L(lang,"Live bracket-balance check — catches unclosed or mismatched { }.","Перевірка балансу дужок у реальному часі — виявляє незакриті або зайві { }.") },
        ].map(s => (
          <div key={s.icon} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
            <span style={{ fontSize:13, minWidth:20, flexShrink:0, textAlign:"center" }}>{s.icon}</span>
            <div>
              <span style={{ fontSize:11, fontWeight:800, color:s.color }}>{s.label} </span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)", lineHeight:1.45 }}>{s.desc}</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:4, lineHeight:1.5 }}>
          {L(lang,
            "The badge updates live as you edit the template. Aim for ≥6 groups and ≥100 combos for strong anti-detection coverage.",
            "Бейдж оновлюється в реальному часі при редагуванні шаблону. Прагніть до ≥6 груп і ≥100 варіацій для надійного захисту від виявлення.",
          )}
        </div>
      </div>

      <div style={{ ...card(AMBER), marginTop:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:AMBER, marginBottom:6 }}>
          💡 {L(lang,"Pro Tips","Поради")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.58)", lineHeight:1.6 }}>
          {L(lang,
            "Keep your seed message short and natural (2–5 sentences). The AI expands it — don't try to pre-write all variations yourself. After generation, you can still manually edit the template field before saving.",
            "Пишіть базове повідомлення коротко і природно (2–5 речень). AI сам розширить варіації — не намагайтесь переписати все вручну. Після генерації ви можете редагувати поле шаблону перед збереженням.",
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide 34 — Verification Hub overview (cross-ref)
// ═══════════════════════════════════════════════════════════════
function SlideVerificationHub({ lang }: SL) {
  return (
    <Shell>
      <STitle icon="🛡️" text={L(lang,"Verification Hub","Центр верифікації")} color="#2dd4bf" />
      <div style={{ ...card("#2dd4bf"), marginBottom:12 }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.65, marginBottom:10 }}>
          {L(lang,
            "When accounts join many groups they may receive anti-bot captcha challenges. The Verification Hub lets you resolve them in real time without leaving the Mini App.",
            "Коли акаунти вступають до багатьох груп, вони можуть отримувати антибот-виклики. Центр верифікації дозволяє вирішувати їх у реальному часі, не виходячи з Mini App."
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[
            ["🔘", "#2dd4bf", L(lang,"Button captchas","Кнопкові капчі"),    L(lang,"Tap the inline keyboard button to prove you are human","Натисніть inline-кнопку, щоб довести, що ви людина")],
            ["✏️", "#3b82f6", L(lang,"Text reply captchas","Текстові капчі"), L(lang,"Type the answer to a math/word challenge and send","Введіть відповідь на математику/запитання і надішліть")],
            ["📡", "#a855f7", L(lang,"Telethon listener","Telethon-слухач"),  L(lang,"Start All in the hub to monitor all active accounts","Натисніть Запустити всі у хабі для відстеження всіх активних акаунтів")],
            ["⏱️", "#f59e0b", L(lang,"4-second auto-poll","Авто-опит 4 с"),  L(lang,"New challenges appear automatically — no manual refresh","Нові виклики з'являються автоматично — без ручного оновлення")],
          ].map(([icon,color,title,desc]) => (
            <div key={title as string} style={{ display:"flex", gap:10, alignItems:"flex-start",
              background:`${color as string}0f`, border:`1px solid ${color as string}28`,
              borderRadius:12, padding:"10px 13px" }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{icon as string}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color: color as string, marginBottom:2 }}>{title as string}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", lineHeight:1.45 }}>{desc as string}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {[
          ["🔔", "#f59e0b", L(lang,"Push Alerts","Push-сповіщення"),
            L(lang,"Set TELEGRAM_TOKEN + ADMIN_TELEGRAM_ID → bot messages you when a captcha arrives","Встановіть TELEGRAM_TOKEN + ADMIN_TELEGRAM_ID → бот надсилає вам повідомлення при капчі")],
          ["⏱️", "#2dd4bf", L(lang,"60 s rate-limit per account","60 с ліміт на акаунт"),
            L(lang,"Multiple captchas on the same account don't spam — one alert/minute maximum","Кілька капч від одного акаунта не спамлять — максимум одне сповіщення/хвилину")],
        ].map(([icon,color,title,desc]) => (
          <div key={title as string} style={{ display:"flex", gap:10, alignItems:"flex-start",
            background:`${color as string}0f`, border:`1px solid ${color as string}28`,
            borderRadius:12, padding:"10px 13px" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{icon as string}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color: color as string, marginBottom:2 }}>{title as string}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.48)", lineHeight:1.45 }}>{desc as string}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...card("#2dd4bf"), padding:"10px 14px" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#2dd4bf", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>
          {L(lang,"📚 Full Documentation","📚 Повна документація")}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", lineHeight:1.55 }}>
          {L(lang,
            "Open the 📚 manual chooser (top-right button) and select the 🛡️ Verification / HITL Captcha guide for the full 13-slide documentation.",
            "Відкрийте вибір 📚 мануалу (кнопка у правому верхньому куті) і оберіть посібник 🛡️ Верифікація / HITL Captcha для повної 13-слайдової документації."
          )}
        </div>
      </div>
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// Slide registry
// ═══════════════════════════════════════════════════════════════
// Keyword hints per slide (English) — used by search in addition to TITLES
const KEYWORDS: string[] = [
  "home intro start welcome",
  "modules tabs navigation structure",
  "dashboard metrics KPI stats",
  "quick actions shortcuts buttons",
  "DM direct message bulk send",
  "editor create template spintax message",
  "groups channels telegram",
  "group broadcast mass send multi-group",
  "settings schedule delay timing",
  "walkthrough step by step how to tutorial",
  "analytics statistics charts graphs",
  "audience users subscribers segments contacts",
  "accounts sender phone sessions bot",
  "bulk import ZIP upload sessions",
  "authorization login code 2FA",
  "proxy SOCKS5 health ping check",
  "revalidation session validate check auto",
  "tools CSV export fleet validate all reval",
  "monitoring alerts crash flood ban daily digest",
  "workers supervisor process restart",
  "tasks queue pending running done",
  "rate limits flood wait quota daily",
  "best practices tips recommendations advice",
  "architecture system design overview",
  "telegram protocol MTProto DC server",
  "sessions security HMAC token revoke",
  "spintax variables random spin text",
  "internals process Python supervisor",
  "database SQLite API endpoints REST",
  "checklist launch deploy production",
  "new features bell toast notification fleet health search digest archive group analytics overlay",
  "AI copilot autonomous assistant gemini groq mutation tools human-in-the-loop HITL approval gate",
  "AI spintax generator wand optimize regenerate tone casual professional direct seed message",
  "what's new latest changelog",
  "verification hub captcha HITL human-in-the-loop listener button text solve group join",
];
const SLIDES: Array<(p: SL) => React.ReactElement> = [
  Slide1,Slide2,Slide3,Slide4,Slide5,Slide6,Slide7,Slide8,Slide9,
  Slide10,Slide11,Slide12,Slide13,SlideAccountsBulk,Slide14,SlideProxyHealth,
  SlideAutoRevalidation,SlideAccountTools,SlideMonitoring,
  Slide15,Slide16,Slide17,Slide18,Slide19,Slide20,Slide21,Slide22,
  Slide23,Slide24,Slide25,SlideAiCopilot,SlideAiSpintax,SlideNewFeatures,
  SlideVerificationHub,
];
const TOTAL = SLIDES.length;

const TITLES: Record<Lang, string[]> = {
  en: [
    "Cover","System Overview","Dashboard","Quick Actions","DM Campaigns",
    "Campaign Editor","Groups","Group Broadcasts","Campaign Settings",
    "Step-by-Step Walkthrough","Analytics","Audience","Sender Accounts",
    "Bulk Account Import","Account Authorization","Proxy Health Check",
    "Auto-Revalidation","Account Tools","Monitoring & Alerts",
    "Workers","Task Queue","Rate Limits","Best Practices","Architecture",
    "Telegram Protocols","Sessions & Security","Spintax Engine",
    "Process Internals","Database & API","Launch Checklist","AI Copilot","AI Spintax","What's New","Verification Hub",
  ],
  ua: [
    "Обкладинка","Огляд системи","Дашборд","Швидкі дії","DM-розсилки",
    "Редактор кампанії","Групи","Групові розсилки","Налаштування кампанії",
    "Покрокове керівництво","Статистика","Аудиторія","Sender-акаунти",
    "Масовий імпорт акаунтів","Авторизація акаунта","Перевірка проксі",
    "Авто-реvalidація","Інструменти акаунтів","Моніторинг і сповіщення",
    "Воркери","Черга задач","Ліміти відправки","Поради та рекомендації",
    "Архітектура","Протоколи Telegram","Сесії та безпека",
    "Рушій спінтаксу","Внутрішня будова процесів","База даних та API","Чеклист запуску","AI Копілот","AI Спінтакс","Нові функції","Центр верифікації",
  ],
};

// ═══════════════════════════════════════════════════════════════
// ManualPage shell
// ═══════════════════════════════════════════════════════════════
export function ManualPage({ onClose, onOpenAccountsGuide }: Props) {
  const { lang } = useI18n();
  const [current, setCurrent]     = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const touchX = useRef(0);
  const touchY = useRef(0);
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
  const titles = TITLES[lang];

  // Search results: filter by title + keywords (case-insensitive)
  const q = searchQuery.toLowerCase().trim();
  const searchResults: Array<{ index: number; title: string }> = q.length < 1 ? [] :
    titles.flatMap((title, i) => {
      const haystack = `${title} ${KEYWORDS[i] ?? ""}`.toLowerCase();
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
                {current + 1} / {TOTAL}
                {current >= 18 && (
                  <span style={{ marginLeft:6, fontSize:9, color:PURPLE, fontWeight:700, background:`${PURPLE}18`,
                    border:`1px solid ${PURPLE}33`, borderRadius:4, padding:"1px 5px" }}>
                    {L(lang,"ADVANCED","ADVANCED")}
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={toggleSearch} style={{ background:showSearch?`${ACCENT}22`:GLASS2,
              border:`1px solid ${showSearch?ACCENT:BORDER2}`, borderRadius:10, width:33, height:33,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:showSearch?ACCENT:"rgba(255,255,255,0.55)", fontSize:15, cursor:"pointer" }}>
              🔍
            </button>
            <button onClick={onClose} style={{ background:GLASS2, border:`1px solid ${BORDER2}`,
              borderRadius:10, width:33, height:33, display:"flex", alignItems:"center",
              justifyContent:"center", color:"rgba(255,255,255,0.6)", fontSize:15, cursor:"pointer" }}>✕</button>
          </div>
        </div>

        {/* Search results dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div style={{ maxHeight:240, overflowY:"auto", borderTop:`1px solid ${BORDER}` }}>
            {searchResults.map(r => (
              <div key={r.index}
                onClick={() => { setCurrent(r.index); setShowSearch(false); setSearchQuery(""); }}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
                  borderBottom:`1px solid rgba(255,255,255,0.04)`, cursor:"pointer",
                  background:"rgba(255,255,255,0.02)" }}>
                <span style={{ fontSize:10, color:PURPLE, fontWeight:700, minWidth:22,
                  background:`${PURPLE}18`, border:`1px solid ${PURPLE}30`, borderRadius:6,
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
            background:`radial-gradient(circle,${ACCENT}18 0%,transparent 68%)` }} />
          <div style={{ position:"absolute", bottom:-80, right:-100, width:300, height:300, borderRadius:"50%",
            background:`radial-gradient(circle,${PURPLE}16 0%,transparent 68%)` }} />
        </div>
        {current === 0
          ? <Slide1 lang={lang} onOpenAccountsGuide={onOpenAccountsGuide} />
          : <SlideComp lang={lang} />
        }
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
