import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  username: text("username"),
  bestStreak: integer("best_streak").default(0).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  poolAmount: text("pool_amount").default("0").notNull(),
  membersCount: integer("members_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userLeagues = pgTable("user_leagues", {
  userId: integer("user_id").references(() => users.id).notNull(),
  leagueId: integer("league_id").references(() => leagues.id).notNull(),
}, (table) => ({
  pk: uniqueIndex("user_league_idx").on(table.userId, table.leagueId),
}));

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fixtureId: integer("fixture_id").notNull(),
  statKey: text("stat_key").notNull(),
  prediction: text("prediction").notNull(), // 'hi' or 'lo'
  result: text("result"), // 'win', 'lose', 'push'
  resolvedValue: integer("resolved_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
