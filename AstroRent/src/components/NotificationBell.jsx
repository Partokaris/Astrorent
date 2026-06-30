import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";

function NotificationBell({
  notifications = [],
  storageKey,
  onNotificationClick,
  buttonClassName = "",
  panelClassName = ""
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState(() => {
    if (!storageKey) {
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });
  const bellRef = useRef(null);

  const sortedNotifications = useMemo(() => (
    [...notifications].sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")))
  ), [notifications]);

  const unreadCount = sortedNotifications.filter((item) => !readIds.includes(item.id)).length;

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(readIds));
  }, [readIds, storageKey]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!bellRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);

    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const markRead = (id) => {
    setReadIds((current) => (
      current.includes(id) ? current : [...current, id]
    ));
  };

  const markAllRead = () => {
    setReadIds(sortedNotifications.map((item) => item.id));
  };

  const handleNotificationClick = (item) => {
    markRead(item.id);
    setOpen(false);
    onNotificationClick?.(item);
  };

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${buttonClassName}`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className={`absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${panelClassName}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">Notifications</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread update{unreadCount === 1 ? "" : "s"}</p>
            </div>
            {sortedNotifications.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {sortedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No updates yet. The bell will light up when something changes.
              </div>
            ) : sortedNotifications.map((item) => {
              const unread = !readIds.includes(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${unread ? "bg-blue-50/70 dark:bg-blue-950/30" : ""}`}
                >
                  <span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${unread ? "bg-blue-600" : "bg-slate-300"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-900 dark:text-slate-100">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{item.body}</span>
                    {item.time && <span className="mt-2 block text-xs font-semibold text-slate-400">{formatNotificationTime(item.time)}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {sortedNotifications.length > 0 && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <CheckCircle2 size={14} />
              Select an update to open its message.
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function formatNotificationTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default NotificationBell;
