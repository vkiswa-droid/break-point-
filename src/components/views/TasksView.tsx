import React, { useState } from 'react';
import { CheckSquare, Bell, Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { memoryDatabase } from '../../services/memory/database';
import { proactiveScheduler, SchedulerAlert } from '../../services/scheduler/proactiveScheduler';
import { Reminder } from '../../types';

export const TasksView: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(memoryDatabase.getAllReminders());
  const [alerts, setAlerts] = useState<SchedulerAlert[]>(proactiveScheduler.getAlerts());
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState('15');
  const [newPriority, setNewPriority] = useState<Reminder['priority']>('medium');

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const mins = parseInt(newMinutes) || 15;
    const due = new Date(Date.now() + mins * 60 * 1000).toISOString();

    memoryDatabase.saveReminder({
      title: newTitle.trim(),
      dueAt: due,
      status: 'pending',
      priority: newPriority
    });

    setNewTitle('');
    setReminders(memoryDatabase.getAllReminders());
  };

  const handleToggleComplete = (id: string, currentStatus: Reminder['status']) => {
    const next = currentStatus === 'pending' ? 'completed' : 'pending';
    memoryDatabase.updateReminderStatus(id, next);
    setReminders(memoryDatabase.getAllReminders());
  };

  const handleDelete = (id: string) => {
    memoryDatabase.deleteReminder(id);
    setReminders(memoryDatabase.getAllReminders());
  };

  const handleClearAlerts = () => {
    proactiveScheduler.clearAlerts();
    setAlerts([]);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto font-mono select-text">
      {/* Header */}
      <div className="border-b border-breakpoint-panelBorder pb-4 select-none">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-breakpoint-cyan" />
          <h1 className="text-lg font-hud font-bold tracking-wider text-white">
            PROACTIVE ASSISTANCE & TASK MONITORING
          </h1>
        </div>
        <p className="text-xs text-breakpoint-textMuted mt-0.5">
          Deterministic Schedulers • Local Reminders • Telemetry Warning Thresholds • Daily Morning Briefings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Reminders & Tasks */}
        <div className="space-y-4">
          <div className="hud-panel p-5 rounded-lg space-y-4">
            <h2 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2 select-none">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Schedule New Reminder</span>
            </h2>

            <form onSubmit={handleAddReminder} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Task / Reminder Title:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Inspect production deployment, Push commit, Rest eyes"
                  className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Due In (Minutes):</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Priority:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Reminder['priority'])}
                    className="w-full px-3 py-2 rounded bg-black/60 border border-breakpoint-panelBorder text-white focus:outline-none focus:border-breakpoint-cyan"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded text-xs font-bold bg-breakpoint-cyan text-black hover:bg-cyan-300 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>SET LOCAL REMINDER</span>
              </button>
            </form>
          </div>

          {/* Active Tasks List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider select-none">
              Active & Completed Tasks ({reminders.length})
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {reminders.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 hud-panel rounded-lg">
                  No scheduled reminders. Add one above or tell Break Point to remind you.
                </div>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                      r.status === 'completed'
                        ? 'bg-black/30 border-zinc-800 text-zinc-500'
                        : 'hud-panel border-breakpoint-panelBorder text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleComplete(r.id, r.status)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          r.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-400 text-black'
                            : 'border-zinc-600 hover:border-cyan-400'
                        }`}
                      >
                        {r.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div>
                        <div className={`font-semibold ${r.status === 'completed' ? 'line-through' : 'text-white'}`}>
                          {r.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                          <span>Due: {new Date(r.dueAt).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span
                            className={`font-bold ${
                              r.priority === 'critical' ? 'text-red-400' :
                              r.priority === 'high' ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            {r.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Proactive Notifications & Alerts Feed */}
        <div className="hud-panel p-5 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-breakpoint-panelBorder pb-3 select-none">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase">
              <Bell className="w-4 h-4 text-purple-400" />
              <span>System & Telemetry Alerts Feed</span>
            </div>
            {alerts.length > 0 && (
              <button
                onClick={handleClearAlerts}
                className="text-[10px] text-zinc-500 hover:text-white"
              >
                DISMISS ALL
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                All monitoring parameters nominal. No active system warnings or pending alerts.
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    a.priority === 'high' || a.priority === 'critical'
                      ? 'bg-red-950/40 border-red-600/50 text-red-200'
                      : a.type === 'daily_briefing'
                      ? 'bg-purple-950/40 border-purple-600/40 text-purple-200'
                      : 'bg-black/50 border-breakpoint-panelBorder text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      {a.priority === 'high' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      <span>{a.title}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-300">{a.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
