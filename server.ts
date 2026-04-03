import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import express, { type CookieOptions } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database("reputation.db");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    discord_id TEXT UNIQUE,
    name TEXT NOT NULL,
    display_name TEXT,
    icon_url TEXT,
    bio TEXT,
    password_hash TEXT,
    is_public BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    attended BOOLEAN DEFAULT 0,
    roles TEXT, -- JSON array of roles
    memo TEXT,
    evidence_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(event_id) REFERENCES events(id)
  );
`);

const existingUserColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
if (!existingUserColumns.some(c => c.name === "discord_id")) {
  db.exec("ALTER TABLE users ADD COLUMN discord_id TEXT;");
}
if (!existingUserColumns.some(c => c.name === "password_hash")) {
  db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
}

// Discord ID は唯一であることが望ましいが、既存テーブルに対して直接 UNIQUE 制約は追加できないため、
// まず通常インデックスを作成しておく。
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);");
} catch (error) {
  // DB がすでに UNIQUE 制約を含む場合などは無視
}

const hashPassword = (password: string) => crypto.createHash("sha256").update(password).digest("hex");

// Seed some events if empty
const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
if (eventCount.count === 0) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  
  db.prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)").run("コミュニティ・ミートアップ", today, "月例のコミュニティ交流会です。");
  db.prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)").run("技術ワークショップ", tomorrow, "ハンズオン形式のコーディングセッション。");
  db.prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)").run("運営会議", nextWeek, "次回のイベント企画について話し合います。");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const PORT = 3000;
  const useLocalAuth = process.env.NODE_ENV !== "production" || process.env.LOCAL_AUTH === "true";
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === "production",
  };

  // Auth Middleware
  const getAuthenticatedUser = (req: express.Request) => {
    const userId = req.cookies.user_id;
    if (!userId) return null;
    return db.prepare("SELECT id, google_id, discord_id, name, display_name, icon_url, bio, is_public FROM users WHERE id = ?").get(userId) as any;
  };

  // Auth Routes
  app.get("/api/auth/url", (req, res) => {
    if (useLocalAuth) {
      return res.json({ url: "/auth/local" });
    }
    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`;
    res.json({ url });
  });

  app.post("/api/auth/discord/login", (req, res) => {
    const { discord_id, password } = req.body;
    if (!discord_id || !password) {
      return res.status(400).json({ error: "Discord ID とパスワードを入力してください" });
    }

    const user = db.prepare("SELECT * FROM users WHERE discord_id = ?").get(discord_id) as any;
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: "Discord ID またはパスワードが正しくありません" });
    }

    res.cookie("user_id", user.id, cookieOptions);
    res.json({ success: true });
  });

  app.post("/api/auth/register", (req, res) => {
    const { discord_id, password, display_name } = req.body;
    if (!discord_id || !password) {
      return res.status(400).json({ error: "Discord ID とパスワードを入力してください" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE discord_id = ?").get(discord_id);
    if (existing) {
      return res.status(409).json({ error: "この Discord ID はすでに使用されています" });
    }

    const name = display_name?.trim() || discord_id;
    const result = db.prepare(
      "INSERT INTO users (discord_id, google_id, name, display_name, icon_url, bio, password_hash, is_public) VALUES (?, NULL, ?, ?, ?, NULL, ?, 1)"
    ).run(discord_id, name, display_name || discord_id, "", hashPassword(password));

    res.cookie("user_id", result.lastInsertRowid, cookieOptions);
    res.json({ success: true });
  });

  app.get("/auth/local", (req, res) => {
    const googleId = "local-user";
    const name = "Local Dev User";
    const picture = "https://via.placeholder.com/80?text=Local";

    let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) as any;
    if (!user) {
      const result = db.prepare("INSERT INTO users (google_id, name, display_name, icon_url) VALUES (?, ?, ?, ?)")
        .run(googleId, name, name, picture);
      user = { id: result.lastInsertRowid };
    }

    res.cookie("user_id", user.id, cookieOptions);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Local login succeeded. Closing window...</p>
        </body>
      </html>
    `);
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("Code missing");

    try {
      const redirectUri = `${process.env.APP_URL}/auth/callback`;
      const { tokens } = await client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error("No payload");

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name || email || "Unknown";
      const picture = payload.picture;

      let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId) as any;
      if (!user) {
        const result = db.prepare("INSERT INTO users (google_id, name, display_name, icon_url) VALUES (?, ?, ?, ?)").run(googleId, name, name, picture);
        user = { id: result.lastInsertRowid };
      }

      res.cookie("user_id", user.id, cookieOptions);
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>認証に成功しました。このウィンドウは自動的に閉じます。</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("user_id");
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const user = getAuthenticatedUser(req);
    res.json(user);
  });

  app.post("/api/profile", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { display_name, icon_url, bio, is_public } = req.body;
    db.prepare("UPDATE users SET display_name = ?, icon_url = ?, bio = ?, is_public = ? WHERE id = ?")
      .run(display_name, icon_url, bio, is_public ? 1 : 0, user.id);
    res.json({ success: true });
  });

  // API Routes
  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events").all();
    res.json(events);
  });

  app.get("/api/contributions/:userId", (req, res) => {
    const contributions = db.prepare("SELECT * FROM contributions WHERE user_id = ?").all(req.params.userId);
    res.json(contributions);
  });

  app.post("/api/contributions", (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { event_id, attended, roles, memo, evidence_url } = req.body;
    const rolesJson = JSON.stringify(roles);
    
    try {
      const stmt = db.prepare(`
        INSERT INTO contributions (user_id, event_id, attended, roles, memo, evidence_url)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, event_id) DO UPDATE SET
          attended = excluded.attended,
          roles = excluded.roles,
          memo = excluded.memo,
          evidence_url = excluded.evidence_url
      `);
      stmt.run(user.id, event_id, attended ? 1 : 0, rolesJson, memo, evidence_url);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/ranking", (req, res) => {
    const month = req.query.month as string; // YYYY-MM
    const ranking = db.prepare(`
      SELECT 
        u.id, 
        u.display_name, 
        u.icon_url,
        u.is_public,
        SUM(CASE WHEN c.attended = 1 THEN 1 ELSE 0 END) as attendance_count,
        SUM(json_array_length(c.roles)) as role_points
      FROM users u
      LEFT JOIN contributions c ON u.id = c.user_id
      LEFT JOIN events e ON c.event_id = e.id
      WHERE e.date LIKE ? OR e.date IS NULL
      GROUP BY u.id
      ORDER BY role_points DESC
    `).all(`${month}%`);
    res.json(ranking);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
