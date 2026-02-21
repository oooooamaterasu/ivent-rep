import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";

const db = new Database("reputation.db");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    name TEXT NOT NULL,
    display_name TEXT,
    icon_url TEXT,
    bio TEXT,
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

  // Auth Middleware
  const getAuthenticatedUser = (req: express.Request) => {
    const userId = req.cookies.user_id;
    if (!userId) return null;
    return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  };

  // Auth Routes
  app.get("/api/auth/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email`;
    res.json({ url });
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

      res.cookie("user_id", user.id, { httpOnly: true, sameSite: 'none', secure: true });
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
