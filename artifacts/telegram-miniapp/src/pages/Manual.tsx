import { useState, useRef, useCallback } from "react";

interface Props { onClose: () => void }

const TOTAL = 17;

const ACCENT   = "#00d4ff";
const PURPLE   = "#a855f7";
const AMBER    = "#f59e0b";
const GREEN    = "#10d88a";
const PINK     = "#f472b6";
const BG       = "#07090f";
const GLASS    = "rgba(255,255,255,0.055)";
const GLASS2   = "rgba(255,255,255,0.09)";
const BORDER   = "rgba(255,255,255,0.10)";
const BORDER2  = "rgba(255,255,255,0.16)";

const cardStyle = (accent = ACCENT): React.CSSProperties => ({
  background: GLASS2,
  border: `1px solid ${BORDER2}`,
  borderRadius: 16,
  padding: "18px 20px",
  backdropFilter: "blur(12px)",
  boxShadow: `0 0 18px ${accent}18`,
  marginBottom: 12,
});

const tag = (color: string, label: string) => (
  <span style={{
    background: `${color}22`,
    border: `1px solid ${color}44`,
    color,
    borderRadius: 8,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 600,
    marginRight: 6,
    display: "inline-block",
    marginBottom: 4,
  }}>{label}</span>
);

const numberBadge = (n: number, color: string) => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    background: `${color}22`, border: `2px solid ${color}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, color, flexShrink: 0,
  }}>{n}</div>
);

const stepRow = (n: number, color: string, title: string, desc: string) => (
  <div key={n} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
    {numberBadge(n, color)}
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

const sectionTitle = (icon: string, text: string, color = ACCENT) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: `${color}20`, border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20,
    }}>{icon}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>{text}</div>
  </div>
);

function SlideShell({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      overflowY: "auto", overflowX: "hidden",
      padding: "28px 22px 36px",
      display: "flex", flexDirection: "column",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Slide1Cover() {
  return (
    <SlideShell style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{
        width: 90, height: 90, borderRadius: 28,
        background: `linear-gradient(135deg, ${ACCENT}33, ${PURPLE}33)`,
        border: `2px solid ${ACCENT}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 44, marginBottom: 28,
        boxShadow: `0 0 40px ${ACCENT}33`,
      }}>⛽</div>
      <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>
        PROMO-Fuel
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: ACCENT, marginBottom: 6 }}>
        Руководство пользователя
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>
        Полное описание всех функций системы
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {[["🎯","Кампании"], ["👥","Аудитория"], ["📊","Аналитика"], ["🤖","Воркеры"]].map(([ic, lb]) => (
          <div key={lb} style={{
            background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", gap: 6,
          }}><span>{ic}</span><span>{lb}</span></div>
        ))}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 32, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
        Листайте вправо →
      </div>
    </SlideShell>
  );
}

function Slide2Overview() {
  const modules = [
    { icon: "🏠", color: ACCENT,  name: "Главная",    desc: "Дашборд метрик" },
    { icon: "📢", color: PURPLE,  name: "Рассылки",   desc: "Управление кампаниями" },
    { icon: "🔗", color: GREEN,   name: "Группы",     desc: "Групповые рассылки" },
    { icon: "📈", color: AMBER,   name: "Статистика", desc: "Аналитика и графики" },
    { icon: "👤", color: PINK,    name: "Аудитория",  desc: "Сегменты пользователей" },
    { icon: "🔐", color: ACCENT,  name: "Аккаунты",   desc: "Sender-аккаунты TG" },
    { icon: "⚙️", color: PURPLE,  name: "Воркеры",    desc: "Фоновые процессы" },
    { icon: "🔑", color: AMBER,   name: "AUTH",       desc: "Авторизация аккаунтов" },
  ];
  return (
    <SlideShell>
      {sectionTitle("🗺️", "Обзор системы", ACCENT)}
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 18, lineHeight: 1.5 }}>
        PROMO-Fuel — платформа для массовых Telegram-рассылок. 8 основных модулей:
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {modules.map(m => (
          <div key={m.name} style={{
            background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14,
            padding: "14px 14px",
          }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function Slide3Dashboard() {
  return (
    <SlideShell style={{ padding: 0 }}>
      <div style={{ padding: "28px 22px 14px" }}>
        {sectionTitle("🏠", "Главная / Дашборд", ACCENT)}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
          Центральный экран: ключевые метрики, статус воркеров и быстрые действия.
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <img
          src="/screenshots/home.jpg"
          alt="Dashboard screenshot"
          style={{ width: "100%", display: "block", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
        />
        <div style={{
          position: "absolute", top: 8, left: 12, right: 12,
          display: "flex", gap: 6, flexWrap: "wrap",
        }}>
          {[
            { label: "Отправлено", top: "4%", left: "2%" },
            { label: "Активные", top: "4%", left: "52%" },
          ].map(a => (
            <div key={a.label} style={{
              background: `${ACCENT}dd`, borderRadius: 6, padding: "2px 8px",
              fontSize: 10, fontWeight: 700, color: "#000",
            }}>{a.label}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 22px 36px" }}>
        <div style={{ ...cardStyle(GREEN), marginBottom: 0 }}>
          <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 4 }}>4 метрики в реальном времени</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Отправлено · Активные кампании · Охват · Конверсия (open rate)
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

function Slide4QuickActions() {
  const actions = [
    { icon: "📢", color: ACCENT,  label: "Новая рассылка",   desc: "Открывает редактор кампании" },
    { icon: "🔗", color: GREEN,   label: "Группы",           desc: "Перейти к групповым рассылкам" },
    { icon: "📊", color: AMBER,   label: "Статистика",       desc: "Аналитика и графики" },
    { icon: "👤", color: PINK,    label: "Аудитория",        desc: "Управление сегментами" },
    { icon: "🔐", color: PURPLE,  label: "Аккаунты",         desc: "Sender-аккаунты" },
    { icon: "⚙️", color: ACCENT,  label: "Воркеры",          desc: "Мониторинг процессов" },
  ];
  return (
    <SlideShell>
      {sectionTitle("⚡", "Быстрые действия", AMBER)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 18, lineHeight: 1.5 }}>
        Блок «Быстрые действия» на главной — мгновенный доступ к 6 ключевым функциям одним касанием.
      </div>
      {actions.map(a => (
        <div key={a.label} style={{
          display: "flex", gap: 14, alignItems: "center", marginBottom: 10,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${a.color}20`, border: `1.5px solid ${a.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
          }}>{a.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 1 }}>{a.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{a.desc}</div>
          </div>
        </div>
      ))}
    </SlideShell>
  );
}

function Slide5Campaigns() {
  return (
    <SlideShell>
      {sectionTitle("📢", "Рассылки", PURPLE)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 18, lineHeight: 1.5 }}>
        Список кампаний с фильтрами, поиском и статусами. Открывается через вкладку «Рассылки».
      </div>
      <div style={cardStyle(PURPLE)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Статусы кампании</div>
        {[
          ["🟢", "active",   "Активна — рассылка идёт"],
          ["🟡", "paused",   "Пауза — остановлена вручную"],
          ["🔴", "finished", "Завершена — все сообщения отправлены"],
          ["⚫", "draft",    "Черновик — ещё не запущена"],
        ].map(([dot, key, desc]) => (
          <div key={key} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{dot}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{key} </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>— {desc}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={cardStyle(ACCENT)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Действия в списке</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          ✏️ Редактировать кампанию{"\n"}
          ⏸️ / ▶️ Пауза / Возобновить{"\n"}
          🗑️ Удалить кампанию{"\n"}
          📋 Просмотр статистики отправок
        </div>
      </div>
    </SlideShell>
  );
}

function Slide6Editor() {
  return (
    <SlideShell>
      {sectionTitle("✏️", "Редактор кампании", PINK)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Создание и настройка кампании. Открывается кнопкой «Новая рассылка» или через редактирование.
      </div>
      {[
        { field: "Название",       icon: "🏷️", desc: "Внутреннее имя кампании",               color: ACCENT  },
        { field: "Текст сообщения",icon: "💬", desc: "Поддерживает {спинтакс|вариации}",      color: PURPLE  },
        { field: "Аккаунт",        icon: "🔐", desc: "Sender-аккаунт для отправки",            color: PINK    },
        { field: "Аудитория",      icon: "👥", desc: "Сегмент или все пользователи",           color: GREEN   },
        { field: "Задержка",       icon: "⏱️", desc: "Секунды между сообщениями",              color: AMBER   },
        { field: "Медиа",          icon: "📎", desc: "Фото, видео, документы (необязательно)", color: ACCENT  },
      ].map(f => (
        <div key={f.field} style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 8,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.field}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{f.desc}</div>
          </div>
        </div>
      ))}
      <div style={{ ...cardStyle(AMBER), marginTop: 4 }}>
        <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 4 }}>💡 Спинтакс</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          Используйте{" "}<code style={{ background: GLASS2, padding: "1px 5px", borderRadius: 4, color: "#fff" }}>&#123;текст1|текст2|текст3&#125;</code>{" "}для автоматической ротации текста в каждом сообщении.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide7Groups() {
  return (
    <SlideShell>
      {sectionTitle("🔗", "Группы", GREEN)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Раздел «Группы» управляет Telegram-группами и каналами для массовых рассылок.
      </div>
      <div style={cardStyle(GREEN)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Откуда берутся группы?</div>
        {stepRow(1, GREEN, "Привяжите аккаунт", "Sender-аккаунт с доступом к группам в разделе «Аккаунты»")}
        {stepRow(2, GREEN, "Обновите список", "Кнопка «Обновить группы» — синхронизация с Telegram")}
        {stepRow(3, GREEN, "Выберите для рассылки", "Отметьте нужные группы в редакторе групповой кампании")}
      </div>
      <div style={cardStyle(AMBER)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Управление группами</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          🚫 Забанить группу — исключить из рассылок{"\n"}
          ✅ Снять бан — вернуть в пул{"\n"}
          🔄 Обновить список всех групп
        </div>
      </div>
    </SlideShell>
  );
}

function Slide8GroupBroadcast() {
  return (
    <SlideShell>
      {sectionTitle("📡", "Групповые рассылки", PURPLE)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Раздел «Рассылки по группам» — кампании, которые отправляют сообщения в Telegram-группы, а не личные чаты.
      </div>
      {[
        { icon: "📋", color: PURPLE, title: "Список групповых кампаний",   desc: "Все созданные кампании с их статусом" },
        { icon: "➕", color: ACCENT,  title: "Создать новую",               desc: "Кнопка «+» открывает редактор" },
        { icon: "📊", color: GREEN,   title: "Статистика",                  desc: "Вкладка «Стат» — детальный отчёт" },
        { icon: "📝", color: AMBER,   title: "Логи",                        desc: "Вкладка «Логи» — история отправок" },
        { icon: "⬇️", color: PINK,   title: "Экспорт CSV",                 desc: "Выгрузить логи/статистику в файл" },
      ].map(item => (
        <div key={item.title} style={{
          display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${item.color}20`, border: `1.5px solid ${item.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
          }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{item.desc}</div>
          </div>
        </div>
      ))}
    </SlideShell>
  );
}

function Slide9BroadcastSettings() {
  return (
    <SlideShell>
      {sectionTitle("⚙️", "Настройки рассылки", AMBER)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Ключевые параметры групповой рассылки при создании кампании.
      </div>
      {[
        { icon: "🕐", color: AMBER,  field: "Интервал между сообщениями", desc: "Секунды — важно для защиты от флуд-бана" },
        { icon: "📝", color: ACCENT, field: "Шаблон сообщения",           desc: "Выберите из библиотеки шаблонов" },
        { icon: "🔀", color: GREEN,  field: "Спинтакс в тексте",          desc: "{Привет|Здравствуйте|Добрый день}" },
        { icon: "👥", color: PURPLE, field: "Выбор групп",                desc: "Выберите всё или отдельные группы" },
        { icon: "🔄", color: PINK,   field: "Повтор рассылки",            desc: "Расписание: раз в N часов" },
        { icon: "🔐", color: AMBER,  field: "Sender-аккаунт",             desc: "Аккаунт, от которого идут сообщения" },
      ].map(f => (
        <div key={f.field} style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 8,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px",
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.field}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{f.desc}</div>
          </div>
        </div>
      ))}
      <div style={{ ...cardStyle(AMBER), marginTop: 4 }}>
        <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 4 }}>⚠️ Рекомендация</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          Устанавливайте интервал не менее 15-30 секунд, чтобы избежать FloodWait-ограничений от Telegram.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide10Analytics() {
  return (
    <SlideShell>
      {sectionTitle("📊", "Статистика", AMBER)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Раздел «Стат.» содержит подробные графики и отчёты по всем рассылкам.
      </div>
      {[
        { label: "Всего отправлено",    icon: "📤", color: ACCENT,  val: "Общее число сообщений" },
        { label: "Успешно",            icon: "✅", color: GREEN,   val: "Доставлено без ошибок" },
        { label: "Ошибки",             icon: "❌", color: "#ef4444", val: "Недоставленные сообщения" },
        { label: "Охват пользователей",icon: "👥", color: PURPLE,  val: "Уникальные получатели" },
        { label: "Open rate",          icon: "👁️", color: PINK,   val: "Конверсия по прочтению" },
        { label: "Активных кампаний",  icon: "🔥", color: AMBER,   val: "Сейчас в работе" },
      ].map(m => (
        <div key={m.label} style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 8,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${m.color}20`, border: `1px solid ${m.color}40`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
          }}>{m.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{m.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{m.val}</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
        </div>
      ))}
      <div style={cardStyle(ACCENT)}>
        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 4 }}>📈 Графики</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          SVG-графики: динамика отправок по дням, распределение по кампаниям, процент ошибок.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide11Audience() {
  return (
    <SlideShell>
      {sectionTitle("👤", "Аудитория", PINK)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Управление базой пользователей и создание сегментов для точных рассылок.
      </div>
      <div style={cardStyle(PINK)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Функции раздела</div>
        {[
          ["👁️", "Просмотр", "Вся база пользователей с фильтрами"],
          ["🏷️", "Сегменты",  "Группировка по тегам и параметрам"],
          ["📤", "Экспорт",  "Выгрузка в CSV для внешней работы"],
          ["📥", "Импорт",   "Загрузка аудитории через вкладку Upload"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: PINK }}>{title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={cardStyle(PURPLE)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Данные пользователя</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["chat_id", "username", "first_name", "last_name", "tags", "created_at"].map(f => (
            <span key={f} style={{
              background: GLASS2, border: `1px solid ${BORDER}`,
              borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "rgba(255,255,255,0.7)",
            }}>{f}</span>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

function Slide12Accounts() {
  return (
    <SlideShell>
      {sectionTitle("🔐", "Аккаунты", ACCENT)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Sender-аккаунты — Telegram-аккаунты, от имени которых выполняются рассылки.
      </div>
      <div style={cardStyle(ACCENT)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Статусы аккаунта</div>
        {[
          ["🟢", "idle",       ACCENT,  "Готов к работе"],
          ["🔵", "sending",   BLUE,    "Активная отправка"],
          ["🟡", "flood_wait", AMBER,   "Ограничение Telegram"],
          ["🔴", "banned",    "#ef4444","Аккаунт заблокирован"],
          ["⚫", "inactive",  "#6b7280","Деактивирован вручную"],
        ].map(([dot, key, col, desc]) => (
          <div key={key} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{dot}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: col as string }}>{key}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>— {desc}</span>
          </div>
        ))}
      </div>
      <div style={cardStyle(GREEN)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Параметры аккаунта</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          📱 Номер телефона{"\n"}
          🔑 api_id + api_hash (от my.telegram.org){"\n"}
          🌐 Proxy (опционально){"\n"}
          📊 Дневной лимит отправок{"\n"}
          📁 Файл сессии (session_file)
        </div>
      </div>
    </SlideShell>
  );
}

const BLUE = "#3b82f6";

function Slide13AccountAuth() {
  return (
    <SlideShell>
      {sectionTitle("🔑", "Авторизация аккаунта", AMBER)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Пошаговый процесс подключения нового Telegram-аккаунта к системе.
      </div>
      {stepRow(1, AMBER,  "Получите API-ключи",    "Зайдите на my.telegram.org → API development tools → создайте приложение")}
      {stepRow(2, ACCENT, "Добавьте аккаунт",      "В разделе «Аккаунты» нажмите «+» и введите телефон, api_id, api_hash")}
      {stepRow(3, GREEN,  "Нажмите «Авторизовать»","Кнопка AUTH рядом с аккаунтом — система отправит код в Telegram")}
      {stepRow(4, PURPLE, "Введите код",            "Введите код из Telegram (или SMS) в появившемся поле")}
      {stepRow(5, PINK,   "2FA пароль",             "Если включена двухфакторная аутентификация — введите пароль")}
      {stepRow(6, ACCENT, "Готово!",                "Статус сменится на idle — аккаунт готов к рассылкам")}
      <div style={{ ...cardStyle(AMBER), marginTop: 4 }}>
        <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 4 }}>⚠️ Важно</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          Используйте только собственные аккаунты и соблюдайте правила Telegram. Новые аккаунты имеют лимиты на рассылку.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide14Workers() {
  return (
    <SlideShell>
      {sectionTitle("⚙️", "Воркеры", PURPLE)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Воркеры — фоновые процессы, выполняющие рассылки. Каждый воркер обрабатывает очередь задач.
      </div>
      <div style={cardStyle(PURPLE)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Статусы воркера</div>
        {[
          ["🟢", "running",  GREEN,    "Воркер активен, обрабатывает задачи"],
          ["🟡", "idle",     AMBER,    "Воркер запущен, ждёт задач"],
          ["🔴", "crashed",  "#ef4444","Аварийное завершение — см. логи"],
          ["⚫", "stopped",  "#6b7280","Воркер остановлен вручную"],
        ].map(([dot, key, col, desc]) => (
          <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>{dot}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: col as string }}>{key} </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>— {desc}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={cardStyle(ACCENT)}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Управление</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          ▶️ Запустить воркер — команда из UI или терминала{"\n"}
          ⏹️ Остановить воркер — безопасная остановка{"\n"}
          📋 Копировать команду запуска из UI{"\n"}
          📈 Просмотр статистики: задач выполнено / ошибок
        </div>
      </div>
      <div style={{ ...cardStyle(GREEN), marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 6 }}>⏱️ Панель скорости аккаунтов</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
          Под суммарными плитками — виджет <b style={{ color: "#fff" }}>«Скорость / мин — все аккаунты»</b>: 
          сетка мини-полосок для каждого активного аккаунта. Обновляется каждые 15 с.
          Цвет: 🟢 свободно · 🟡 умеренно · 🔴 лимит почти исчерпан.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide15TaskQueue() {
  return (
    <SlideShell>
      {sectionTitle("📋", "Очередь задач", GREEN)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16, lineHeight: 1.5 }}>
        Система очередей распределяет задачи между воркерами. Поддерживает параллельную обработку и автовосстановление после сбоев.
      </div>
      {[
        { icon: "📥", color: ACCENT,  title: "pending",    desc: "Задача ждёт свободного воркера" },
        { icon: "⚡", color: GREEN,   title: "running",    desc: "Воркер активно обрабатывает задачу" },
        { icon: "✅", color: GREEN,   title: "done",       desc: "Задача выполнена успешно" },
        { icon: "❌", color: "#ef4444",title: "failed",   desc: "Ошибка — задача остановлена" },
        { icon: "🔄", color: AMBER,   title: "retrying",  desc: "Повторная попытка после ошибки" },
      ].map(s => (
        <div key={s.title} style={{
          display: "flex", gap: 12, alignItems: "center", marginBottom: 8,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px",
        }}>
          <span style={{ fontSize: 18 }}>{s.icon}</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.title}</span>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <div style={cardStyle(GREEN)}>
        <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginBottom: 4 }}>🔒 Надёжность</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
          Трёхуровневая блокировка: asyncio.Lock + FileLock + SQL. Автоматический retry с экспоненциальной задержкой. Максимум 5 падений — после чего воркер останавливается и уведомляет.
        </div>
      </div>
    </SlideShell>
  );
}

function Slide16RateLimit() {
  return (
    <SlideShell>
      {sectionTitle("⏱️", "Лимиты отправки", ACCENT)}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
        Система контролирует скорость отправки для каждого аккаунта, чтобы не превышать лимиты Telegram.
      </div>

      {/* Visual gauges description */}
      <div style={cardStyle(ACCENT)}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>📊 Визуальные индикаторы</div>
        {[
          { where: "Аккаунты → карточка", what: "Раздел «Скорость / мин»: прогресс-бар + счётчик X/Y + обратный отсчёт ↺Nс до сброса окна" },
          { where: "Воркеры → вверху", what: "Сетка «Скорость / мин — все аккаунты»: мини-полоска на каждый активный аккаунт, обновл. 15 с" },
        ].map(g => (
          <div key={g.where} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>{g.where}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, lineHeight: 1.5 }}>{g.what}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {[["🟢", ">50%", GREEN], ["🟡", "25–50%", AMBER], ["🔴", "<25%", "#ef4444"]].map(([dot, label, col]) => (
            <div key={label} style={{ flex: 1, textAlign: "center", borderRadius: 8, padding: "6px 4px", background: `${col as string}14`, border: `1px solid ${col as string}28` }}>
              <div style={{ fontSize: 16 }}>{dot}</div>
              <div style={{ fontSize: 10, color: col as string, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>остаток</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle(PURPLE)}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Параметры лимитов</div>
        {[
          ["ACCOUNT_RATE_LIMIT_MAX", "20", "Сообщений за скользящее окно"],
          ["ACCOUNT_RATE_LIMIT_WIN", "60", "Длина окна в секундах"],
        ].map(([key, val, desc]) => (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: PURPLE, fontFamily: "monospace", marginBottom: 2 }}>{key}={val}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{desc}</div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function Slide17BestPractices() {
  const tips = [
    { icon: "⏱️", color: AMBER,   tip: "Интервалы", desc: "Минимум 15-30 сек между сообщениями. FloodWait = аккаунт временно заблокирован." },
    { icon: "🔀", color: GREEN,   tip: "Спинтакс",  desc: "Всегда используйте вариации текста — Telegram лучше реагирует на уникальные сообщения." },
    { icon: "📱", color: ACCENT,  tip: "Аккаунты",  desc: "Для крупных рассылок — несколько аккаунтов + ротация. Один аккаунт: ≤20 сообщений/мин." },
    { icon: "🌐", color: PURPLE,  tip: "Прокси",    desc: "Для аккаунтов из разных регионов используйте соответствующие прокси." },
    { icon: "📊", color: PINK,    tip: "Мониторинг",desc: "Проверяйте вкладку «Воркеры» — crashed воркер нужно перезапустить вручную." },
    { icon: "🔒", color: GREEN,   tip: "Сессии",    desc: "Храните session-файлы в безопасном месте. Их потеря = повторная авторизация." },
  ];
  return (
    <SlideShell>
      {sectionTitle("💡", "Советы и рекомендации", AMBER)}
      {tips.map(t => (
        <div key={t.tip} style={{
          display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10,
          background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${t.color}20`, border: `1.5px solid ${t.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
          }}>{t.icon}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.color, marginBottom: 2 }}>{t.tip}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>{t.desc}</div>
          </div>
        </div>
      ))}
    </SlideShell>
  );
}

function Slide18Closing() {
  return (
    <SlideShell style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.8, marginBottom: 8 }}>
        Готово к работе!
      </div>
      <div style={{ fontSize: 15, color: ACCENT, fontWeight: 600, marginBottom: 24 }}>
        PROMO-Fuel запущен и настроен
      </div>
      <div style={{ ...cardStyle(GREEN), width: "100%", textAlign: "left", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 8 }}>Чеклист запуска</div>
        {[
          "✅ Добавлен и авторизован хотя бы один аккаунт",
          "✅ Воркер запущен и в статусе idle/running",
          "✅ Создана первая кампания с текстом",
          "✅ Выбрана аудитория или группы",
          "✅ Кампания активирована",
        ].map((item, i) => (
          <div key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 5 }}>{item}</div>
        ))}
      </div>
      <div style={{
        background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14,
        padding: "14px 18px", width: "100%", textAlign: "left",
      }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Конфигурация</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
          🔧 API Server: port 8080{"\n"}
          🤖 Bot Supervisor: port 8083{"\n"}
          📱 Mini App: port 5000{"\n"}
          🗄️ Database: campaigns.db (SQLite)
        </div>
      </div>
    </SlideShell>
  );
}

const SLIDES_COMPONENTS = [
  Slide1Cover,
  Slide2Overview,
  Slide3Dashboard,
  Slide4QuickActions,
  Slide5Campaigns,
  Slide6Editor,
  Slide7Groups,
  Slide8GroupBroadcast,
  Slide9BroadcastSettings,
  Slide10Analytics,
  Slide11Audience,
  Slide12Accounts,
  Slide13AccountAuth,
  Slide14Workers,
  Slide15TaskQueue,
  Slide16RateLimit,
  Slide17BestPractices,
  Slide18Closing,
];

const SLIDE_TITLES = [
  "Обложка",
  "Обзор системы",
  "Главная / Дашборд",
  "Быстрые действия",
  "Рассылки",
  "Редактор кампании",
  "Группы",
  "Групповые рассылки",
  "Настройки рассылки",
  "Статистика",
  "Аудитория",
  "Аккаунты",
  "Авторизация аккаунта",
  "Воркеры",
  "Очередь задач",
  "Лимиты отправки",
  "Советы",
  "Запуск",
];

const REAL_TOTAL = SLIDES_COMPONENTS.length;

export function ManualPage({ onClose }: Props) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(REAL_TOTAL - 1, c + 1)), []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 48 && dy < 60) {
      if (dx < 0) next(); else prev();
    }
  }

  const SlideComp = SLIDES_COMPONENTS[current];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: BG,
        display: "flex", flexDirection: "column",
        userSelect: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px 8px",
        borderBottom: `1px solid ${BORDER}`,
        background: "rgba(7,9,15,0.8)",
        backdropFilter: "blur(16px)",
        flexShrink: 0,
        zIndex: 2,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: -0.2 }}>
            {SLIDE_TITLES[current]}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
            {current + 1} / {REAL_TOTAL}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: GLASS2, border: `1px solid ${BORDER}`, borderRadius: 10,
            width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.6)", fontSize: 16, cursor: "pointer",
          }}
        >✕</button>
      </div>

      {/* Slide area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Mesh bg */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(170deg,${BG} 0%,#0b1020 40%,${BG} 100%)` }} />
          <div style={{ position: "absolute", top: -160, left: -80, width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle,${ACCENT}1a 0%,transparent 68%)` }} />
          <div style={{ position: "absolute", bottom: -80, right: -100, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${PURPLE}18 0%,transparent 68%)` }} />
        </div>
        <SlideComp />
      </div>

      {/* Bottom nav */}
      <div style={{
        flexShrink: 0, padding: "10px 20px 18px",
        borderTop: `1px solid ${BORDER}`,
        background: "rgba(7,9,15,0.85)",
        backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={prev}
          disabled={current === 0}
          style={{
            background: current === 0 ? "rgba(255,255,255,0.04)" : GLASS2,
            border: `1px solid ${current === 0 ? "rgba(255,255,255,0.06)" : BORDER2}`,
            borderRadius: 12, padding: "10px 18px", fontSize: 14,
            color: current === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
            cursor: current === 0 ? "default" : "pointer",
          }}
        >← Назад</button>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 5, flexWrap: "wrap" }}>
          {SLIDES_COMPONENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? ACCENT : "rgba(255,255,255,0.18)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        <button
          onClick={current === REAL_TOTAL - 1 ? onClose : next}
          style={{
            background: current === REAL_TOTAL - 1
              ? `linear-gradient(135deg,${GREEN},${ACCENT})`
              : `linear-gradient(135deg,${ACCENT},${PURPLE})`,
            border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 14,
            color: "#fff", fontWeight: 700, cursor: "pointer",
            boxShadow: `0 0 16px ${ACCENT}44`,
          }}
        >
          {current === REAL_TOTAL - 1 ? "✓ Закрыть" : "Далее →"}
        </button>
      </div>
    </div>
  );
}
