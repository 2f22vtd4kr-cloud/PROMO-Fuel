import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  customType,
  index,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() { return "bytea"; },
});

/**
 * Proxy store — managed by artifacts/api-server/src/routes/proxy-store.ts
 * Stored in Replit PostgreSQL so proxies survive deployments.
 * SQLite also keeps a mirror copy for fast local reads.
 */
export const savedProxies = pgTable("saved_proxies", {
  id:             serial("id").primaryKey(),
  countryCode:    text("country_code").notNull(),
  label:          text("label").notNull().default(""),
  proxyString:    text("proxy_string").notNull(),
  lastSessionNum: integer("last_session_num").notNull().default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_saved_proxies_country").on(t.countryCode),
]);

/**
 * SQLite snapshot — managed by db_sync.py
 * Binary snapshot of campaigns.db so the SQLite database
 * survives Replit's ephemeral filesystem between deployments.
 */
export const pfDbSnapshot = pgTable("pf_db_snapshot", {
  key:       text("key").primaryKey(),
  dbData:    bytea("db_data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Session files — managed by db_sync.py and pg-pool.ts
 * Telethon .session file binaries stored in PostgreSQL so registered
 * accounts survive between deployments.
 */
export const pfSessionFiles = pgTable("pf_session_files", {
  filename:  text("filename").primaryKey(),
  data:      bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
