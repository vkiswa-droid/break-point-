import { memoryDatabase } from '../memory/database';
import { reflectionEngine } from '../memory/reflectionEngine';

export interface SchedulerAlert {
  id: string;
  type: 'reminder' | 'system_warning' | 'daily_briefing' | 'reflection';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
}

export class ProactiveScheduler {
  private timer: any = null;
  private alerts: SchedulerAlert[] = [];
  private isRunning: boolean = false;
  private dailyBriefingSentDate: string = '';

  constructor() {
    this.loadAlerts();
  }

  private loadAlerts() {
    try {
      const saved = localStorage.getItem('breakpoint_scheduler_alerts');
      if (saved) {
        this.alerts = JSON.parse(saved);
      }
    } catch {}
  }

  private persistAlerts() {
    try {
      localStorage.setItem('breakpoint_scheduler_alerts', JSON.stringify(this.alerts.slice(-50)));
    } catch {}
    window.dispatchEvent(new CustomEvent('breakpoint:alerts_updated', { detail: this.alerts }));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Deterministic tick every 10 seconds
    this.timer = setInterval(() => {
      this.checkDueReminders();
      this.checkSystemHealth();
      this.checkDailyBriefing();
    }, 10000);

    // Initial check
    this.checkDueReminders();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  getAlerts(): SchedulerAlert[] {
    return [...this.alerts];
  }

  markAlertRead(id: string) {
    const a = this.alerts.find(alert => alert.id === id);
    if (a) {
      a.read = true;
      this.persistAlerts();
    }
  }

  clearAlerts() {
    this.alerts = [];
    this.persistAlerts();
  }

  private addAlert(alert: Omit<SchedulerAlert, 'id' | 'timestamp' | 'read'>) {
    const newAlert: SchedulerAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.alerts.unshift(newAlert);
    this.persistAlerts();

    // Trigger desktop notification if supported
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`BREAK POINT: ${newAlert.title}`, {
          body: newAlert.message,
          icon: '/favicon.ico'
        });
      } catch {}
    }

    // Play alert sound if priority is high or critical
    if (newAlert.priority === 'high' || newAlert.priority === 'critical') {
      window.dispatchEvent(new CustomEvent('breakpoint:system_alert', { detail: newAlert }));
    }
  }

  private checkDueReminders() {
    const reminders = memoryDatabase.getAllReminders();
    const now = Date.now();

    reminders.forEach(r => {
      if (r.status === 'pending') {
        const dueTime = new Date(r.dueAt).getTime();
        if (dueTime <= now) {
          // Mark completed
          memoryDatabase.updateReminderStatus(r.id, 'completed');
          this.addAlert({
            type: 'reminder',
            title: `Reminder: ${r.title}`,
            message: `Scheduled task reached due time (${new Date(r.dueAt).toLocaleTimeString()}).`,
            priority: r.priority || 'medium'
          });
        }
      }
    });
  }

  private checkSystemHealth() {
    // Check real browser memory if available
    const mem: any = (performance as any).memory;
    if (mem && mem.usedJSHeapSize && mem.jsHeapSizeLimit) {
      const usageRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      if (usageRatio > 0.88) {
        // High memory warning
        const existingRecent = this.alerts.find(
          a => a.type === 'system_warning' && Date.now() - new Date(a.timestamp).getTime() < 10 * 60 * 1000
        );
        if (!existingRecent) {
          this.addAlert({
            type: 'system_warning',
            title: 'Telemetry Warning: High Memory Consumption',
            message: `JS Heap utilization is at ${Math.round(usageRatio * 100)}%. Consider archiving inactive background processes.`,
            priority: 'high'
          });
        }
      }
    }
  }

  private checkDailyBriefing() {
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();

    // Trigger morning briefing once per day around 8am - 10am
    if (hour >= 8 && hour <= 11 && this.dailyBriefingSentDate !== today) {
      this.dailyBriefingSentDate = today;
      const reminders = memoryDatabase.getAllReminders().filter(r => r.status === 'pending');

      this.addAlert({
        type: 'daily_briefing',
        title: 'Good Morning, Sir — Daily Briefing',
        message: `All core services are online. You have ${reminders.length} active scheduled task(s) for today. Memory vault synchronized.`,
        priority: 'low'
      });

      // Optionally run background reflection during quiet hours
      reflectionEngine.runReflectionJob().catch(() => {});
    }
  }
}

export const proactiveScheduler = new ProactiveScheduler();
