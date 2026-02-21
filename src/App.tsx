/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Trophy, 
  User as UserIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink,
  LogOut,
  Settings,
  Star,
  Crown,
  Gift
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Event, Contribution, RankingEntry, ROLES } from "./types";

// Custom styles for the "Quiet Celebration" theme
const themeStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;500&family=M+PLUS+Rounded+1c:wght@700&display=swap');

  :root {
    --bg-color: #fcfcf9;
    --text-main: #4a4a4a;
    --accent-pink: #ffb7c5;
    --accent-blue: #a2d2ff;
    --accent-gold: #f9d423;
  }

  body {
    background-color: var(--bg-color);
    color: var(--text-main);
    font-family: 'Cormorant Garamond', serif;
  }

  h1, h2, h3, h4, .font-rounded {
    font-family: 'M PLUS Rounded 1c', sans-serif;
  }

  .shadow-soft {
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.03);
  }

  .bg-glow {
    position: fixed;
    top: -10%;
    right: -10%;
    width: 50vw;
    height: 50vw;
    background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(252,252,249,0) 70%);
    z-index: -1;
    pointer-events: none;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(5deg); }
  }

  .floating {
    animation: float 6s ease-in-out infinite;
  }
`;

export default function App() {
  const [view, setView] = useState<"calendar" | "ranking">("calendar");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = themeStyles;
    document.head.appendChild(styleSheet);
    
    fetchMe();
    fetchEvents();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchMe();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchMe = async () => {
    const res = await fetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      setCurrentUser(data);
    } else {
      setCurrentUser(null);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
  };

  useEffect(() => {
    if (currentUser) {
      fetch(`/api/contributions/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          setContributions(data.map((c: any) => ({
            ...c,
            attended: !!c.attended,
            roles: JSON.parse(c.roles || "[]")
          })));
        });
    } else {
      setContributions([]);
    }
  }, [currentUser]);

  const handleLogin = async () => {
    const res = await fetch("/api/auth/url");
    const { url } = await res.json();
    window.open(url, 'google_login', 'width=500,height=600');
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const getContributionForEvent = (eventId: number) => {
    return contributions.find(c => c.event_id === eventId);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="bg-glow" />
      
      {/* Floating Decorations */}
      <div className="fixed top-20 left-[10%] opacity-20 floating pointer-events-none">
        <Crown size={48} className="text-[#f9d423]" />
      </div>
      <div className="fixed bottom-40 right-[15%] opacity-20 floating pointer-events-none" style={{ animationDelay: '-2s' }}>
        <Gift size={64} className="text-[#ffb7c5]" />
      </div>
      <div className="fixed top-1/2 right-[10%] opacity-20 floating pointer-events-none" style={{ animationDelay: '-4s' }}>
        <Star size={32} className="text-[#a2d2ff]" />
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#a2d2ff] to-[#ffb7c5] rounded-2xl flex items-center justify-center text-white shadow-sm">
              <Trophy size={22} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#4a4a4a]">Event Reputation</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex bg-stone-100/50 p-1.5 rounded-2xl">
              <button
                onClick={() => setView("calendar")}
                className={`px-6 py-2 rounded-xl text-sm font-rounded transition-all ${view === "calendar" ? "bg-white shadow-soft text-[#a2d2ff]" : "text-stone-400 hover:text-stone-600"}`}
              >
                カレンダー
              </button>
              <button
                onClick={() => setView("ranking")}
                className={`px-6 py-2 rounded-xl text-sm font-rounded transition-all ${view === "ranking" ? "bg-white shadow-soft text-[#a2d2ff]" : "text-stone-400 hover:text-stone-600"}`}
              >
                ランキング
              </button>
            </nav>

            {currentUser ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm group-hover:border-[#a2d2ff] transition-all">
                    {currentUser.icon_url ? (
                      <img src={currentUser.icon_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-rounded font-bold text-[#4a4a4a]">{currentUser.display_name}</div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-widest">Profile</div>
                  </div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-stone-300 hover:text-red-400 transition-colors"
                  title="ログアウト"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="px-6 py-2.5 bg-[#a2d2ff] text-white rounded-2xl font-rounded text-sm font-bold shadow-md shadow-[#a2d2ff]/20 hover:-translate-y-0.5 transition-all"
              >
                Googleでログイン
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {view === "calendar" ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-[2.5rem] shadow-soft border border-stone-50 overflow-hidden">
                <div className="p-10 border-b border-stone-50 flex items-center justify-between">
                  <h2 className="text-2xl font-rounded font-bold text-[#4a4a4a]">
                    {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                  </h2>
                  <div className="flex gap-3">
                    <button onClick={handlePrevMonth} className="w-12 h-12 flex items-center justify-center hover:bg-stone-50 rounded-2xl transition-colors text-stone-400">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={handleNextMonth} className="w-12 h-12 flex items-center justify-center hover:bg-stone-50 rounded-2xl transition-colors text-stone-400">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-stone-50">
                  {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square border-r border-b border-stone-50/50 bg-stone-50/20" />
                  ))}
                  {Array.from({ length: daysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div 
                        key={day} 
                        className="aspect-square border-r border-b border-stone-50 p-3 hover:bg-stone-50/50 transition-colors cursor-pointer group relative"
                        onClick={() => dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                      >
                        <span className="text-sm font-rounded font-bold text-stone-400 group-hover:text-[#a2d2ff] transition-colors">{day}</span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dayEvents.map(e => {
                            const contrib = getContributionForEvent(e.id);
                            return (
                              <div 
                                key={e.id} 
                                className={`w-2.5 h-2.5 rounded-full shadow-sm ${contrib?.attended ? 'bg-[#ffb7c5]' : 'bg-stone-200'}`}
                                title={e.title}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <RankingView month={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`} />
          )}
        </AnimatePresence>
      </main>

      {/* Event Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventModal 
            event={selectedEvent} 
            user={currentUser} 
            contribution={getContributionForEvent(selectedEvent.id)}
            onClose={() => setSelectedEvent(null)}
            onSave={() => {
              setSelectedEvent(null);
              fetchMe(); // Refresh contributions via fetchMe cascade
            }}
            onLogin={handleLogin}
          />
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <ProfileModal 
            user={currentUser} 
            onClose={() => setShowProfileModal(false)}
            onSave={() => {
              setShowProfileModal(false);
              fetchMe();
            }}
          />
        )}
      </AnimatePresence>

      <footer className="max-w-5xl mx-auto px-6 py-12 text-center">
        <p className="text-xs text-stone-300 uppercase tracking-[0.3em] font-medium">
          &copy; 2026 Event Reputation - Quiet Celebration
        </p>
      </footer>
    </div>
  );
}

function RankingView({ month }: { month: string }) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    fetch(`/api/ranking?month=${month}`)
      .then(res => res.json())
      .then(setRanking);
  }, [month]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-[2.5rem] shadow-soft border border-stone-50 overflow-hidden"
    >
      <div className="p-10 border-b border-stone-50">
        <h2 className="text-2xl font-rounded font-bold text-[#4a4a4a]">今月のランキング - {month}</h2>
      </div>
      <div className="divide-y divide-stone-50">
        {ranking.length === 0 ? (
          <div className="p-20 text-center text-stone-300 font-medium italic">まだデータがありません</div>
        ) : (
          ranking.map((entry, index) => (
            <div key={entry.id} className="p-6 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
              <div className="flex items-center gap-6">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-rounded font-bold text-sm shadow-sm ${
                  index === 0 ? 'bg-[#f9d423] text-white' : 
                  index === 1 ? 'bg-stone-200 text-stone-600' :
                  index === 2 ? 'bg-[#ffb7c5] text-white' : 'text-stone-300 border border-stone-100'
                }`}>
                  {index + 1}
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    {entry.icon_url ? (
                      <img src={entry.icon_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300">
                        <UserIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-rounded font-bold text-[#4a4a4a]">
                      {entry.is_public ? entry.display_name : `User-${entry.id.toString().padStart(4, '0')}`}
                    </div>
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{entry.attendance_count} イベント参加</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-rounded font-bold text-[#a2d2ff]">{entry.role_points}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-stone-300">Points</div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function EventModal({ event, user, contribution, onClose, onSave, onLogin }: { 
  event: Event, 
  user: User | null, 
  contribution?: Contribution,
  onClose: () => void,
  onSave: () => void,
  onLogin: () => void
}) {
  const [attended, setAttended] = useState(contribution?.attended || false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(contribution?.roles || []);
  const [memo, setMemo] = useState(contribution?.memo || "");
  const [evidenceUrl, setEvidenceUrl] = useState(contribution?.evidence_url || "");
  const [isSaving, setIsSaving] = useState(false);

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          attended,
          roles: selectedRoles,
          memo,
          evidence_url: evidenceUrl
        })
      });
      if (res.ok) onSave();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/10 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-stone-50"
      >
        <div className="p-10 border-b border-stone-50 relative">
          <div className="absolute top-8 right-8 flex gap-2">
            <Star size={20} className="text-[#f9d423] opacity-30" />
            <Crown size={20} className="text-[#a2d2ff] opacity-30" />
          </div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-3xl font-rounded font-bold text-[#4a4a4a] leading-tight">{event.title}</h3>
            <button onClick={onClose} className="text-stone-300 hover:text-stone-500 transition-colors">
              <Plus className="rotate-45" size={28} />
            </button>
          </div>
          <div className="flex items-center gap-3 text-stone-400 text-sm font-medium">
            <CalendarIcon size={16} />
            <span>{event.date}</span>
          </div>
          <p className="mt-6 text-stone-500 leading-relaxed italic">{event.description}</p>
        </div>

        <div className="p-10 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {!user ? (
            <div className="bg-stone-50 rounded-3xl p-8 text-center">
              <p className="text-stone-500 font-medium mb-6">貢献を記録するにはログインが必要です</p>
              <button 
                onClick={onLogin}
                className="px-8 py-3 bg-[#a2d2ff] text-white rounded-2xl font-rounded font-bold shadow-lg shadow-[#a2d2ff]/20 hover:-translate-y-0.5 transition-all"
              >
                Googleでログイン
              </button>
            </div>
          ) : (
            <>
              {/* Attendance */}
              <div className="flex items-center justify-between">
                <label className="font-rounded font-bold text-[#4a4a4a]">参加しましたか？</label>
                <button 
                  onClick={() => setAttended(!attended)}
                  className={`w-14 h-8 rounded-full transition-all relative ${attended ? 'bg-[#ffb7c5]' : 'bg-stone-100 shadow-inner'}`}
                >
                  <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${attended ? 'left-7.5' : 'left-1.5'}`} />
                </button>
              </div>

              {/* Roles */}
              <div>
                <label className="block font-rounded font-bold text-[#4a4a4a] mb-4">役割を選択（各+1ポイント）</label>
                <div className="flex flex-wrap gap-2.5">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-5 py-2.5 rounded-2xl text-sm font-rounded font-bold border-2 transition-all ${
                        selectedRoles.includes(role) 
                          ? 'bg-[#a2d2ff]/10 border-[#a2d2ff] text-[#a2d2ff] shadow-sm' 
                          : 'bg-white border-stone-100 text-stone-300 hover:border-stone-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="block font-rounded font-bold text-[#4a4a4a] mb-3">メモ</label>
                <textarea 
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full bg-stone-50 border-2 border-stone-50 rounded-[1.5rem] p-5 text-sm focus:outline-none focus:border-[#a2d2ff]/30 transition-all min-h-[120px] placeholder:text-stone-300"
                  placeholder="どんなことをしましたか？"
                />
              </div>

              {/* Evidence URL */}
              <div>
                <label className="block font-rounded font-bold text-[#4a4a4a] mb-3">証跡URL</label>
                <div className="relative">
                  <input 
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl p-4 pl-12 text-sm focus:outline-none focus:border-[#a2d2ff]/30 transition-all placeholder:text-stone-300"
                    placeholder="https://..."
                  />
                  <ExternalLink className="absolute left-4 top-4.5 text-stone-300" size={18} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-10 bg-stone-50/50 border-t border-stone-50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-rounded font-bold text-stone-400 hover:bg-stone-100 transition-colors"
          >
            キャンセル
          </button>
          {user && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-6 py-4 rounded-2xl font-rounded font-bold bg-[#ffb7c5] text-white hover:bg-[#ffb7c5]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#ffb7c5]/20 disabled:opacity-50"
            >
              {isSaving ? "保存中..." : "記録を保存する"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ProfileModal({ user, onClose, onSave }: { 
  user: User, 
  onClose: () => void,
  onSave: () => void
}) {
  const [displayName, setDisplayName] = useState(user.display_name || "");
  const [iconUrl, setIconUrl] = useState(user.icon_url || "");
  const [bio, setBio] = useState(user.bio || "");
  const [isPublic, setIsPublic] = useState(user.is_public);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          icon_url: iconUrl,
          bio,
          is_public: isPublic
        })
      });
      if (res.ok) onSave();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/10 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-stone-50"
      >
        <div className="p-10 border-b border-stone-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings size={22} className="text-[#a2d2ff]" />
            <h3 className="text-2xl font-rounded font-bold text-[#4a4a4a]">プロフィール編集</h3>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-stone-500 transition-colors">
            <Plus className="rotate-45" size={28} />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div>
            <label className="block font-rounded font-bold text-[#4a4a4a] mb-3">表示名</label>
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#a2d2ff]/30 transition-all"
              placeholder="あなたの名前"
            />
          </div>

          <div>
            <label className="block font-rounded font-bold text-[#4a4a4a] mb-3">アイコン画像URL</label>
            <input 
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#a2d2ff]/30 transition-all"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block font-rounded font-bold text-[#4a4a4a] mb-3">ひとこと</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-stone-50 border-2 border-stone-50 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#a2d2ff]/30 transition-all min-h-[80px]"
              placeholder="自己紹介など"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block font-rounded font-bold text-[#4a4a4a]">ランキングに公開</label>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Public Setting</p>
            </div>
            <button 
              onClick={() => setIsPublic(!isPublic)}
              className={`w-14 h-8 rounded-full transition-all relative ${isPublic ? 'bg-[#a2d2ff]' : 'bg-stone-100 shadow-inner'}`}
            >
              <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isPublic ? 'left-7.5' : 'left-1.5'}`} />
            </button>
          </div>
        </div>

        <div className="p-10 bg-stone-50/50 border-t border-stone-50 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-rounded font-bold text-stone-400 hover:bg-stone-100 transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-4 rounded-2xl font-rounded font-bold bg-[#a2d2ff] text-white hover:bg-[#a2d2ff]/90 hover:-translate-y-0.5 transition-all shadow-lg shadow-[#a2d2ff]/20 disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
