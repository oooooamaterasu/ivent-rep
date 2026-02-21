import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("reputation.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
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

// Seed some data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (name) VALUES (?)").run("Alice");
  db.prepare("INSERT INTO users (name) VALUES (?)").run("Bob");
  db.prepare("INSERT INTO users (name) VALUES (?)").run("Charlie");
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  db.prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)").run("Community Meetup", today, "Monthly community gathering");
  db.prepare("INSERT INTO events (title, date, description) VALUES (?, ?, ?)").run("Tech Workshop", tomorrow, "Hands-on coding session");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events").all();
    res.json(events);
  });

  app.get("/api/contributions/:userId", (req, res) => {
    const contributions = db.prepare("SELECT * FROM contributions WHERE user_id = ?").all(req.params.userId);
    res.json(contributions);
  });

  app.post("/api/contributions", (req, res) => {
    const { user_id, event_id, attended, roles, memo, evidence_url } = req.body;
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
      stmt.run(user_id, event_id, attended ? 1 : 0, rolesJson, memo, evidence_url);
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
        u.name, 
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
