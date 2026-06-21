import { useState, useEffect, useCallback } from "react";

const C = {
  bg:     "#07090f",
  bg2:    "#0b1020",
  text:   "#e8eef8",
  muted:  "#5a6a8a",
  sec:    "#8fa4c8",
  green:  "#2de897",
  blue:   "#6ba8e5",
  yellow: "#ffc946",
  red:    "#ff6b7a",
  purple: "#c4aeff",
};

const glass = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 20,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as React.CSSProperties;

function Tag({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 14px", borderRadius: 30,
      background: bg, border: `1px solid ${color}44`,
      color, fontSize: "clamp(9px,1.1vw,13px)", fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase" as const,
    }}>
      {children}
    </div>
  );
}

function Dot({ color = C.green }: { color?: string }) {
  return <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, marginTop: "0.45em" }} />;
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, color: C.sec, fontSize: "clamp(12px,1.5vw,20px)", lineHeight: 1.5 }}>
      <Dot color={color} />
      <span>{children}</span>
    </div>
  );
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...glass, padding: "2.4vh 2vw", ...style }}>
      {children}
    </div>
  );
}

function StatBox({ num, label, sub, color }: { num: string; label: string; sub?: string; color: string }) {
  return (
    <GlassCard style={{ borderRadius: 16 }}>
      <div style={{ fontSize: "clamp(22px,3vw,44px)", fontWeight: 900, color, lineHeight: 1 }}>{num}</div>
      <div style={{ fontSize: "clamp(10px,1.1vw,15px)", color: C.sec, fontWeight: 600, marginTop: "0.5vh" }}>{label}</div>
      {sub && <div style={{ fontSize: "clamp(9px,0.9vw,12px)", color: C.muted, marginTop: "0.3vh" }}>{sub}</div>}
    </GlassCard>
  );
}

function SlideWrapper({ children, accent = C.green, active, dir }: {
  children: React.ReactNode; accent?: string; active: boolean; dir: "in" | "out" | "left";
}) {
  const transform = !active
    ? dir === "left" ? "translateX(-50px)" : "translateX(50px)"
    : "translateX(0)";
  return (
    <div style={{
      position: "absolute", inset: 0,
      padding: "5vh 6vw",
      display: "flex", flexDirection: "column",
      opacity: active ? 1 : 0,
      transform,
      transition: "opacity 0.42s cubic-bezier(.4,0,.2,1), transform 0.42s cubic-bezier(.4,0,.2,1)",
      pointerEvents: active ? "all" : "none",
      overflow: "hidden",
    }}>
      {/* Background mesh */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 70% 60% at 15% 8%, rgba(80,140,220,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 50% 50% at 82% 82%, rgba(30,215,140,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 82% 12%, rgba(196,174,255,0.09) 0%, transparent 55%),
          linear-gradient(168deg, #07090f 0%, #0b1020 45%, #0a1330 72%, #09101f 100%)
        `,
      }} />
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%", height: 2, zIndex: 2,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
      }} />
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, opacity: 0.025,
        backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "clamp(9px,1vw,13px)", fontWeight: 700, letterSpacing: "0.10em",
      textTransform: "uppercase" as const, color: C.muted, marginBottom: "1.5vh",
    }}>{children}</div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "clamp(22px,3.8vw,54px)", fontWeight: 800,
      lineHeight: 1.08, letterSpacing: "-0.03em", color: C.text,
      marginBottom: "2.5vh",
    }}>{children}</div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "clamp(13px,1.6vw,22px)", color: C.sec, lineHeight: 1.5, maxWidth: 740 }}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "3vh" }}>
      <div style={{
        width: "clamp(32px,4vw,52px)", height: "clamp(32px,4vw,52px)", borderRadius: 14,
        background: "linear-gradient(135deg,rgba(45,232,151,0.2),rgba(107,168,229,0.2))",
        border: "1px solid rgba(45,232,151,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "clamp(18px,2.2vw,28px)",
      }}>⛽</div>
      <span style={{ fontSize: "clamp(14px,1.6vw,22px)", fontWeight: 800, color: C.text }}>PROMO-Fuel</span>
    </div>
  );
}

/* ── SLIDES ──────────────────────────────────────────────────────── */

const slides = [
  // 1 — Cover
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.green} active={active} dir={dir}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", maxWidth: 860 }}>
        <Logo />
        <h1 style={{ fontSize: "clamp(32px,6vw,86px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-0.04em", color: C.text, marginBottom: "3vh" }}>
          Умные промо-<br /><span style={{ color: C.green }}>рассылки</span> для АЗС
        </h1>
        <Sub>Telegram Mini App для владельцев топливных сетей — управляй кампаниями, аудиторией и аналитикой прямо в мессенджере.</Sub>
        <div style={{ display: "flex", gap: "1.2vw", marginTop: "4vh", flexWrap: "wrap" }}>
          <Tag color={C.green} bg="rgba(45,232,151,0.12)">✅ MVP в продакшне</Tag>
          <Tag color={C.blue} bg="rgba(107,168,229,0.10)">📱 Telegram Mini App</Tag>
          <Tag color={C.yellow} bg="rgba(255,201,70,0.10)">⛽ B2B SaaS</Tag>
        </div>
      </div>
    </SlideWrapper>
  ),

  // 2 — Problem
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.red} active={active} dir={dir}>
      <SectionLabel>Проблема</SectionLabel>
      <H2>АЗС <span style={{ color: C.red }}>теряют клиентов</span> без стратегии удержания</H2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh" }}>
        <Bullet color={C.red}>Водители не возвращаются без стимула — нет программ лояльности</Bullet>
        <Bullet color={C.red}>Традиционные SMS-рассылки дорогие и неэффективные</Bullet>
        <Bullet color={C.red}>Нет данных о поведении и предпочтениях аудитории</Bullet>
        <Bullet color={C.red}>Конкуренты переманивают клиентов скидками через маркетплейсы</Bullet>
      </div>
      <div style={{ marginTop: "4vh" }}>
        <GlassCard style={{ borderRadius: 18, borderColor: "rgba(255,107,122,0.2)", maxWidth: 340 }}>
          <div style={{ fontSize: "clamp(28px,4vw,56px)", fontWeight: 900, color: C.red }}>-35%</div>
          <div style={{ fontSize: "clamp(12px,1.3vw,18px)", color: C.sec, marginTop: "0.5vh" }}>среднее падение повторных визитов на АЗС без программы лояльности</div>
        </GlassCard>
      </div>
    </SlideWrapper>
  ),

  // 3 — Solution
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.green} active={active} dir={dir}>
      <SectionLabel>Решение</SectionLabel>
      <H2>Telegram как канал <span style={{ color: C.green }}>лояльности</span></H2>
      <Sub>PROMO-Fuel — Mini App внутри Telegram, через которое владелец АЗС управляет промо-кампаниями прямо из мессенджера.</Sub>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.4vh", marginTop: "2.5vh" }}>
        <Bullet color={C.green}>Мгновенные уведомления подписчикам о скидках</Bullet>
        <Bullet color={C.green}>Таргетинг по сегментам аудитории и тегам</Bullet>
        <Bullet color={C.green}>Аналитика в реальном времени</Bullet>
      </div>
      <div style={{ display: "flex", gap: "2vw", marginTop: "3vh", alignItems: "center" }}>
        {[
          { icon: "⛽", title: "АЗС", body: "Создаёт промо-акцию в Mini App" },
          { icon: "→", title: "", body: "", isArrow: true },
          { icon: "📱", title: "PROMO-Fuel", body: "Рассылает через Telegram-ботов" },
          { icon: "→", title: "", body: "", isArrow: true },
          { icon: "👤", title: "Клиент", body: "Получает оффер, возвращается" },
        ].map((item, i) => item.isArrow ? (
          <div key={i} style={{ color: C.muted, fontSize: "clamp(20px,2.5vw,36px)" }}>→</div>
        ) : (
          <GlassCard key={i} style={{ flex: 1, borderRadius: 16 }}>
            <div style={{ fontSize: "clamp(22px,2.8vw,38px)" }}>{item.icon}</div>
            <div style={{ fontSize: "clamp(12px,1.4vw,18px)", fontWeight: 700, color: C.text, marginTop: "0.8vh" }}>{item.title}</div>
            <div style={{ fontSize: "clamp(10px,1.1vw,15px)", color: C.sec, marginTop: "0.4vh", lineHeight: 1.4 }}>{item.body}</div>
          </GlassCard>
        ))}
      </div>
    </SlideWrapper>
  ),

  // 4 — Product features
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.blue} active={active} dir={dir}>
      <SectionLabel>Продукт</SectionLabel>
      <H2><span style={{ color: C.blue }}>6 модулей</span> в одном приложении</H2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vh 1.5vw", flex: 1 }}>
        {[
          { icon: "📣", title: "Кампании", body: "Создание, запуск и мониторинг массовых рассылок по аудитории", color: C.blue },
          { icon: "👥", title: "Аудитория", body: "Сегментация по тегам, гео-фильтр (радиус от АЗС), CSV-экспорт", color: C.green },
          { icon: "📊", title: "Аналитика", body: "Охват, конверсия, open rate — SVG-графики в реальном времени", color: C.purple },
          { icon: "🔁", title: "Группы", body: "Рассылки в Telegram-группы с расписанием и spintax-шаблонами", color: C.yellow },
          { icon: "🔑", title: "Аккаунты", body: "Управление Telegram-аккаунтами-отправителями, proxy, лимиты", color: C.blue },
          { icon: "🧪", title: "A/B Тест", body: "Два варианта сообщения — автоматический сплит 50/50 аудитории", color: C.purple },
        ].map((f, i) => (
          <GlassCard key={i} style={{ borderRadius: 16, borderColor: `${f.color}22` }}>
            <div style={{ fontSize: "clamp(18px,2.2vw,30px)", marginBottom: "0.8vh" }}>{f.icon}</div>
            <div style={{ fontSize: "clamp(12px,1.3vw,18px)", fontWeight: 700, color: f.color, marginBottom: "0.6vh" }}>{f.title}</div>
            <div style={{ fontSize: "clamp(9px,1vw,14px)", color: C.sec, lineHeight: 1.4 }}>{f.body}</div>
          </GlassCard>
        ))}
      </div>
    </SlideWrapper>
  ),

  // 5 — A/B Test deep-dive
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.purple} active={active} dir={dir}>
      <SectionLabel>Новая функция</SectionLabel>
      <H2><span style={{ color: C.purple }}>A/B тестирование</span> сообщений</H2>
      <Sub>Отправляй два варианта текста разным половинам аудитории — данные покажут, что конвертирует лучше.</Sub>
      <div style={{ display: "flex", gap: "2vw", marginTop: "3vh", flex: 1 }}>
        <GlassCard style={{ flex: 1, borderRadius: 18, borderColor: "rgba(107,168,229,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5vh" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(107,168,229,0.18)", border: "1px solid rgba(107,168,229,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: C.blue }}>A</div>
            <span style={{ fontSize: "clamp(12px,1.4vw,18px)", fontWeight: 700, color: C.blue }}>Вариант A</span>
            <span style={{ marginLeft: "auto", fontSize: "clamp(10px,1.1vw,14px)", color: C.muted }}>50% аудитории</span>
          </div>
          <div style={{ padding: "1.4vh 1.2vw", background: "rgba(255,255,255,0.04)", borderRadius: 12, fontSize: "clamp(11px,1.2vw,16px)", color: C.sec, lineHeight: 1.6 }}>
            Привет, Иван! 👋<br />Скидка 10₽/л на 92-й — только сегодня. Жди тебя!
          </div>
        </GlassCard>

        <div style={{ display: "flex", alignItems: "center", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <div style={{ height: 4, width: 2, background: "rgba(196,174,255,0.3)", borderRadius: 2 }} />
          <div style={{ fontSize: "clamp(11px,1.2vw,16px)", fontWeight: 800, color: C.purple }}>50/50</div>
          <div style={{ height: 4, width: 2, background: "rgba(196,174,255,0.3)", borderRadius: 2 }} />
        </div>

        <GlassCard style={{ flex: 1, borderRadius: 18, borderColor: "rgba(196,174,255,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5vh" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(196,174,255,0.18)", border: "1px solid rgba(196,174,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: C.purple }}>B</div>
            <span style={{ fontSize: "clamp(12px,1.4vw,18px)", fontWeight: 700, color: C.purple }}>Вариант B</span>
            <span style={{ marginLeft: "auto", fontSize: "clamp(10px,1.1vw,14px)", color: C.muted }}>50% аудитории</span>
          </div>
          <div style={{ padding: "1.4vh 1.2vw", background: "rgba(255,255,255,0.04)", borderRadius: 12, fontSize: "clamp(11px,1.2vw,16px)", color: C.sec, lineHeight: 1.6 }}>
            Иван, мойка в подарок при заправке от 30л. Покажи это сообщение кассиру 🚗
          </div>
        </GlassCard>
      </div>
      <div style={{ display: "flex", gap: "1.5vw", marginTop: "2.5vh" }}>
        {[
          { label: "Отправлено A", val: "1 240", color: C.blue },
          { label: "Открыто A", val: "38%", color: C.blue },
          { label: "Отправлено B", val: "1 238", color: C.purple },
          { label: "Открыто B", val: "51%", color: C.purple },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "1.2vh 1.2vw", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "clamp(16px,2vw,28px)", fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: "clamp(9px,0.95vw,13px)", color: C.muted, marginTop: "0.3vh" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </SlideWrapper>
  ),

  // 6 — Market
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.yellow} active={active} dir={dir}>
      <SectionLabel>Рынок</SectionLabel>
      <H2>Огромный <span style={{ color: C.yellow }}>недооценённый</span> рынок</H2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vh 1.5vw", marginBottom: "2.5vh" }}>
        <StatBox num="25 000+" label="АЗС в России" sub="Потенциальных клиентов" color={C.yellow} />
        <StatBox num="900 млн" label="Пользователей Telegram" sub="Крупнейший мессенджер в РФ" color={C.blue} />
        <StatBox num="₽ 4 200" label="ARPU / месяц (целевой)" sub="Средний чек подписки" color={C.green} />
        <StatBox num="₽ 1.3 млрд" label="TAM (Россия)" sub="Total Addressable Market" color={C.purple} />
      </div>
      <GlassCard style={{ borderRadius: 16, borderColor: "rgba(255,201,70,0.15)" }}>
        <div style={{ display: "flex", gap: "2vw", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "clamp(11px,1.2vw,16px)", color: C.muted, marginBottom: "0.5vh" }}>Проникновение Telegram в РФ</div>
            <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "72%", background: `linear-gradient(90deg, ${C.blue}, ${C.green})`, borderRadius: 8 }} />
            </div>
            <div style={{ fontSize: "clamp(10px,1vw,14px)", color: C.blue, marginTop: "0.5vh", fontWeight: 700 }}>72% смартфонов</div>
          </div>
          <div style={{ width: 1, height: "6vh", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "clamp(11px,1.2vw,16px)", color: C.muted, marginBottom: "0.5vh" }}>Доля АЗС без digital-лояльности</div>
            <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "89%", background: `linear-gradient(90deg, ${C.red}, ${C.yellow})`, borderRadius: 8 }} />
            </div>
            <div style={{ fontSize: "clamp(10px,1vw,14px)", color: C.yellow, marginTop: "0.5vh", fontWeight: 700 }}>~89% — рынок свободен</div>
          </div>
        </div>
      </GlassCard>
    </SlideWrapper>
  ),

  // 7 — Business model
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.green} active={active} dir={dir}>
      <SectionLabel>Бизнес-модель</SectionLabel>
      <H2>SaaS подписка <span style={{ color: C.green }}>+ процент от оборота</span></H2>
      <div style={{ display: "flex", gap: "1.5vw", marginTop: "0.5vh" }}>
        {[
          {
            name: "Старт", price: "₽ 1 990/мес", color: C.blue, features: [
              "1 Telegram-аккаунт", "До 1 000 подписчиков", "Базовые кампании", "Аналитика"
            ]
          },
          {
            name: "Бизнес", price: "₽ 4 990/мес", color: C.green, featured: true, features: [
              "5 аккаунтов-отправителей", "До 10 000 подписчиков", "A/B тест + сегменты", "Группы + Воркеры", "Приоритетная поддержка"
            ]
          },
          {
            name: "Сеть", price: "₽ 12 990/мес", color: C.purple, features: [
              "Без лимита аккаунтов", "Без лимита аудитории", "White-label Mini App", "Дедикейтед сервер", "SLA 99.9%"
            ]
          },
        ].map((plan, i) => (
          <div key={i} style={{
            flex: 1, ...glass, borderRadius: 20,
            borderColor: plan.featured ? `${plan.color}40` : undefined,
            padding: "2.5vh 2vw",
            boxShadow: plan.featured ? `0 0 40px ${plan.color}18` : undefined,
            position: "relative" as const,
          }}>
            {plan.featured && (
              <div style={{ position: "absolute" as const, top: -11, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#000", fontSize: 10, fontWeight: 800, borderRadius: 30, padding: "3px 12px", letterSpacing: "0.06em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>Популярный</div>
            )}
            <div style={{ fontSize: "clamp(14px,1.6vw,20px)", fontWeight: 700, color: plan.color, marginBottom: "0.8vh" }}>{plan.name}</div>
            <div style={{ fontSize: "clamp(18px,2.5vw,32px)", fontWeight: 900, color: C.text, marginBottom: "2vh" }}>{plan.price}</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: "1vh" }}>
              {plan.features.map((f, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(10px,1.1vw,15px)", color: C.sec }}>
                  <span style={{ color: plan.color }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "1.5vw", marginTop: "2vh" }}>
        <GlassCard style={{ borderRadius: 14, flex: 1 }}>
          <div style={{ fontSize: "clamp(10px,1.1vw,14px)", color: C.muted, marginBottom: "0.3vh" }}>Целевая Unit Economics (Бизнес)</div>
          <div style={{ display: "flex", gap: "2vw" }}>
            <div><div style={{ fontSize: "clamp(16px,2vw,26px)", fontWeight: 900, color: C.green }}>₽ 4 990</div><div style={{ fontSize: "clamp(9px,0.9vw,12px)", color: C.muted }}>MRR с клиента</div></div>
            <div><div style={{ fontSize: "clamp(16px,2vw,26px)", fontWeight: 900, color: C.blue }}>₽ 800</div><div style={{ fontSize: "clamp(9px,0.9vw,12px)", color: C.muted }}>CAC (таргет)</div></div>
            <div><div style={{ fontSize: "clamp(16px,2vw,26px)", fontWeight: 900, color: C.purple }}>6.2x</div><div style={{ fontSize: "clamp(9px,0.9vw,12px)", color: C.muted }}>LTV/CAC</div></div>
          </div>
        </GlassCard>
      </div>
    </SlideWrapper>
  ),

  // 8 — Traction
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.green} active={active} dir={dir}>
      <SectionLabel>Текущее состояние</SectionLabel>
      <H2><span style={{ color: C.green }}>MVP запущен</span> — идём к масштабу</H2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5vh 1.5vw", marginBottom: "2.5vh" }}>
        <StatBox num="✅" label="Продакшн MVP" sub="Всё работает, платим серверы" color={C.green} />
        <StatBox num="6" label="Модулей в приложении" sub="Кампании, A/B, Группы, Аналитика..." color={C.blue} />
        <StatBox num="∞" label="Масштабируемость" sub="Multi-worker, proxy rotation" color={C.purple} />
      </div>
      <GlassCard style={{ borderRadius: 18 }}>
        <div style={{ fontSize: "clamp(11px,1.2vw,15px)", fontWeight: 700, color: C.muted, marginBottom: "1.5vh", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Стек технологий</div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.8vh 0.8vw" }}>
          {["React 19 + Vite 7", "TypeScript 5.9", "Express 5", "SQLite + Drizzle ORM", "python-telegram-bot", "SSE Real-time", "Telegram Mini App", "Apple Liquid Glass UI", "pnpm workspaces"].map((tech, i) => (
            <div key={i} style={{ padding: "0.7vh 1.2vw", borderRadius: 30, background: "rgba(107,168,229,0.08)", border: "1px solid rgba(107,168,229,0.18)", color: C.blue, fontSize: "clamp(9px,1vw,14px)", fontWeight: 700 }}>{tech}</div>
          ))}
        </div>
      </GlassCard>
    </SlideWrapper>
  ),

  // 9 — Roadmap
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.blue} active={active} dir={dir}>
      <SectionLabel>Дорожная карта</SectionLabel>
      <H2><span style={{ color: C.blue }}>2024 — 2025:</span> рост и масштаб</H2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.6vh", flex: 1 }}>
        {[
          { q: "Q3 2024", label: "ВЫПОЛНЕНО", items: "MVP: кампании, аудитория, аналитика, аккаунты", color: C.green },
          { q: "Q4 2024", label: "ВЫПОЛНЕНО", items: "A/B тест, группы, multi-worker, watchdog-уведомления", color: C.green },
          { q: "Q1 2025", label: "В РАБОТЕ", items: "Интеграция с кассами АЗС, промо-карты, реферальная система", color: C.blue },
          { q: "Q2 2025", label: "ПЛАН", items: "White-label, маркетплейс промо-шаблонов, мобильное приложение", color: C.yellow },
          { q: "Q3 2025", label: "ПЛАН", items: "Экспансия СНГ, партнёрства с топливными сетями, Series A", color: C.purple },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw", padding: "1.6vh 1.8vw", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ minWidth: "8vw", flexShrink: 0 }}>
              <div style={{ fontSize: "clamp(11px,1.2vw,17px)", fontWeight: 800, color: C.text }}>{row.q}</div>
              <div style={{ fontSize: "clamp(8px,0.85vw,11px)", fontWeight: 700, color: row.color, letterSpacing: "0.07em", textTransform: "uppercase" as const, marginTop: "0.2vh" }}>{row.label}</div>
            </div>
            <div style={{ width: 1, height: "4vh", background: `${row.color}30`, flexShrink: 0, alignSelf: "center" }} />
            <div style={{ fontSize: "clamp(11px,1.2vw,17px)", color: C.sec, lineHeight: 1.4 }}>{row.items}</div>
          </div>
        ))}
      </div>
    </SlideWrapper>
  ),

  // 10 — Team
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.purple} active={active} dir={dir}>
      <SectionLabel>Команда</SectionLabel>
      <H2>Опыт на <span style={{ color: C.purple }}>стыке телекома и продукта</span></H2>
      <div style={{ display: "flex", gap: "2vw", marginTop: "0.5vh" }}>
        {[
          { icon: "👨‍💻", role: "Founder & CTO", skills: "Full-stack разработка, Telegram API, архитектура SaaS, 8 лет в продукте", color: C.blue },
          { icon: "📈", role: "Growth & Sales", skills: "B2B продажи АЗС, топливный рынок, 5 лет в petroleum retail", color: C.green },
          { icon: "🎨", role: "Product & Design", skills: "UX для мобильных super-apps, Apple HIG, Liquid Glass систем-дизайн", color: C.purple },
          { icon: "⚙️", role: "DevOps & Infra", skills: "Telegram-боты в продакшне, proxy-сети, масштабирование worker-пулов", color: C.yellow },
        ].map((m, i) => (
          <GlassCard key={i} style={{ flex: 1, borderRadius: 18, borderColor: `${m.color}22` }}>
            <div style={{ fontSize: "clamp(22px,2.8vw,36px)", marginBottom: "1.2vh" }}>{m.icon}</div>
            <div style={{ fontSize: "clamp(11px,1.2vw,17px)", fontWeight: 700, color: m.color, marginBottom: "0.8vh" }}>{m.role}</div>
            <div style={{ fontSize: "clamp(9px,1vw,14px)", color: C.sec, lineHeight: 1.4 }}>{m.skills}</div>
          </GlassCard>
        ))}
      </div>
      <div style={{ marginTop: "2.5vh" }}>
        <GlassCard style={{ borderRadius: 16 }}>
          <div style={{ display: "flex", gap: "3vw", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "clamp(9px,1vw,13px)", color: C.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Ищем</div>
              <div style={{ fontSize: "clamp(12px,1.4vw,19px)", color: C.text, fontWeight: 600 }}>Seed-инвестиции ₽ 15–30 млн на 18 месяцев роста</div>
            </div>
            <div style={{ display: "flex", gap: "1.5vw" }}>
              {[{ l: "R&D / Найм", v: "40%", c: C.blue }, { l: "Маркетинг", v: "35%", c: C.green }, { l: "Инфра", v: "25%", c: C.purple }].map((b, i) => (
                <div key={i} style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: "clamp(16px,2vw,26px)", fontWeight: 900, color: b.c }}>{b.v}</div>
                  <div style={{ fontSize: "clamp(8px,0.85vw,11px)", color: C.muted }}>{b.l}</div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </SlideWrapper>
  ),

  // 11 — CTA / Closing
  (active: boolean, dir: "in" | "out" | "left") => (
    <SlideWrapper accent={C.green} active={active} dir={dir}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", maxWidth: 800 }}>
        <Logo />
        <h1 style={{ fontSize: "clamp(28px,5vw,72px)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-0.04em", color: C.text, marginBottom: "2.5vh" }}>
          Давайте строить<br /><span style={{ color: C.green }}>будущее АЗС</span> вместе
        </h1>
        <Sub>Готовы к пилоту с вашей сетью или к инвестиционному разговору.</Sub>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vh", marginTop: "3.5vh" }}>
          {[
            { icon: "💬", label: "@promofuel_bot", hint: "Telegram-бот для демо", color: C.blue },
            { icon: "🌐", label: "promofuel.ru", hint: "Сайт и pitch материалы", color: C.green },
            { icon: "📧", label: "hello@promofuel.ru", hint: "Прямой контакт", color: C.purple },
          ].map((link, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "1.2vw" }}>
              <div style={{ width: "clamp(36px,4vw,52px)", height: "clamp(36px,4vw,52px)", borderRadius: 14, background: `${link.color}18`, border: `1px solid ${link.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(16px,2vw,26px)", flexShrink: 0 }}>
                {link.icon}
              </div>
              <div>
                <div style={{ fontSize: "clamp(14px,1.7vw,24px)", color: C.text, fontWeight: 700 }}>{link.label}</div>
                <div style={{ fontSize: "clamp(10px,1.1vw,15px)", color: C.muted }}>{link.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "4vh" }}>
          <Tag color={C.green} bg="rgba(45,232,151,0.12)">⛽ PROMO-Fuel — Двигатель роста для вашей АЗС</Tag>
        </div>
      </div>
    </SlideWrapper>
  ),
];

const TOTAL = slides.length;

export default function PromoDeck() {
  const [current, setCurrent] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [goingForward, setGoingForward] = useState(true);

  const goTo = useCallback((idx: number, forward: boolean) => {
    if (idx < 0 || idx >= TOTAL) return;
    setPrevIdx(current);
    setGoingForward(forward);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => goTo(current + 1, true), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, false), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const progress = ((current + 1) / TOTAL) * 100;

  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: C.text, position: "relative",
      userSelect: "none",
    }}>
      {/* Slides */}
      <div style={{ position: "absolute", inset: 0 }}>
        {slides.map((Slide, i) => {
          const isActive = i === current;
          const wasActive = i === prevIdx;
          const dir: "in" | "out" | "left" = isActive ? "in" : (wasActive ? "left" : goingForward ? "in" : "left");
          return <div key={i}>{Slide(isActive || wasActive, dir)}</div>;
        })}
      </div>

      {/* Click zones */}
      <div onClick={prev} style={{ position: "absolute", left: 0, top: 0, width: "10%", height: "100%", zIndex: 50, cursor: current > 0 ? "w-resize" : "default" }} />
      <div onClick={next} style={{ position: "absolute", right: 0, top: 0, width: "10%", height: "100%", zIndex: 50, cursor: current < TOTAL - 1 ? "e-resize" : "default" }} />

      {/* Bottom nav bar */}
      <div style={{
        position: "absolute", bottom: "3vh", left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: "1.2vw",
        padding: "1.2vh 2vw", borderRadius: 50,
        background: "rgba(11,16,32,0.88)", border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        zIndex: 100,
      }}>
        <button onClick={prev} disabled={current === 0} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
          color: C.text, borderRadius: 10, padding: "0.7vh 1.4vw",
          fontSize: "clamp(11px,1.1vw,15px)", fontWeight: 700,
          cursor: current > 0 ? "pointer" : "default", opacity: current === 0 ? 0.3 : 1,
          transition: "background 0.2s",
        }}>← Назад</button>

        {/* Dot nav */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => goTo(i, i > current)} style={{
              height: 6, borderRadius: 3,
              width: i === current ? 18 : 6,
              background: i === current ? C.green : "rgba(255,255,255,0.25)",
              cursor: "pointer",
              transition: "all 0.25s",
            }} />
          ))}
        </div>

        <div style={{ fontSize: "clamp(11px,1.1vw,15px)", color: C.muted, fontWeight: 700, minWidth: "5ch", textAlign: "center" }}>
          {current + 1} / {TOTAL}
        </div>

        <button onClick={next} disabled={current === TOTAL - 1} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
          color: C.text, borderRadius: 10, padding: "0.7vh 1.4vw",
          fontSize: "clamp(11px,1.1vw,15px)", fontWeight: 700,
          cursor: current < TOTAL - 1 ? "pointer" : "default", opacity: current === TOTAL - 1 ? 0.3 : 1,
          transition: "background 0.2s",
        }}>Вперёд →</button>
      </div>

      {/* Top progress bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 101, background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: `linear-gradient(90deg, ${C.blue}, ${C.green})`,
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>
    </div>
  );
}
