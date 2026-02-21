/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Trophy, User as UserIcon, Plus, ChevronLeft, ChevronRight, Check, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Event, Contribution, RankingEntry, ROLES } from "./types";

export default function App() {
  const [view, setView] = useState<"calendar" | "ranking">("calendar");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersRes, eventsRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/events")
    ]);
    const usersData = await usersRes.json();
    const eventsData = await eventsRes.json();
    setUsers(usersData);
    setEvents(eventsData);
    if (usersData.length > 0 && !currentUser) {
      setCurrentUser(usersData[0]);
    }
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
    }
  }, [currentUser]);

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
    <div className="min-h-screen bg-[#F5F5F4] text-[#1C1917] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Trophy size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Event Reputation</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setView("calendar")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "calendar" ? "bg-white shadow-sm text-emerald-700" : "text-stone-500 hover:text-stone-700"}`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView("ranking")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "ranking" ? "bg-white shadow-sm text-emerald-700" : "text-stone-500 hover:text-stone-700"}`}
              >
                Ranking
              </button>
            </nav>

            <select 
              value={currentUser?.id || ""} 
              onChange={(e) => setCurrentUser(users.find(u => u.id === Number(e.target.value)) || null)}
              className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === "calendar" ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 border-b border-stone-100">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {Array.from({ length: firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square border-r border-b border-stone-50 bg-stone-50/30" />
                  ))}
                  {Array.from({ length: daysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div 
                        key={day} 
                        className="aspect-square border-r border-b border-stone-100 p-2 hover:bg-stone-50 transition-colors cursor-pointer group relative"
                        onClick={() => dayEvents.length > 0 && setSelectedEvent(dayEvents[0])}
                      >
                        <span className="text-sm font-medium text-stone-600">{day}</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {dayEvents.map(e => {
                            const contrib = getContributionForEvent(e.id);
                            return (
                              <div 
                                key={e.id} 
                                className={`w-2 h-2 rounded-full ${contrib?.attended ? 'bg-emerald-500' : 'bg-stone-300'}`}
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
              fetchData(); // Refresh
            }}
          />
        )}
      </AnimatePresence>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
    >
      <div className="p-6 border-b border-stone-100">
        <h2 className="text-lg font-semibold">Monthly Ranking - {month}</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {ranking.length === 0 ? (
          <div className="p-12 text-center text-stone-400">No data for this month.</div>
        ) : (
          ranking.map((entry, index) => (
            <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                  index === 1 ? 'bg-stone-200 text-stone-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' : 'text-stone-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold">{entry.name}</div>
                  <div className="text-xs text-stone-500">{entry.attendance_count} events attended</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600">{entry.role_points}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Points</div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function EventModal({ event, user, contribution, onClose, onSave }: { 
  event: Event, 
  user: User | null, 
  contribution?: Contribution,
  onClose: () => void,
  onSave: () => void
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
      await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          event_id: event.id,
          attended,
          roles: selectedRoles,
          memo,
          evidence_url: evidenceUrl
        })
      });
      onSave();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-stone-100">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold">{event.title}</h3>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
              <Plus className="rotate-45" size={24} />
            </button>
          </div>
          <p className="text-stone-500 text-sm">{event.date}</p>
          <p className="mt-2 text-stone-600">{event.description}</p>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Attendance */}
          <div className="flex items-center justify-between">
            <label className="font-semibold text-stone-700">Attendance</label>
            <button 
              onClick={() => setAttended(!attended)}
              className={`w-12 h-6 rounded-full transition-colors relative ${attended ? 'bg-emerald-500' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${attended ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Roles */}
          <div>
            <label className="block font-semibold text-stone-700 mb-3">Roles (+1 point each)</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedRoles.includes(role) 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                      : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="block font-semibold text-stone-700 mb-2">Memo</label>
            <textarea 
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[80px]"
              placeholder="What did you do?"
            />
          </div>

          {/* Evidence URL */}
          <div>
            <label className="block font-semibold text-stone-700 mb-2">Evidence URL</label>
            <div className="relative">
              <input 
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://..."
              />
              <ExternalLink className="absolute left-3 top-3.5 text-stone-400" size={16} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-stone-50 border-t border-stone-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Contribution"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
