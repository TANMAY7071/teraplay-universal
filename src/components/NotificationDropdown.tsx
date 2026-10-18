import { useState, useEffect } from "react";
import { Bell, Sparkles, Film, Calendar, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: "episode" | "achievement" | "reminder" | "announcement";
  read: boolean;
  link: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "New Episode Released",
    desc: "Battle Through the Heavens Episode 158 is now streaming!",
    time: "2 hours ago",
    type: "episode",
    read: false,
    link: "/watch/battle-through-the-heavens/episode-158"
  },
  {
    id: 2,
    title: "Realm Advancement!",
    desc: "You promoted to 'Foundation Establishment (Early Stage)'. Keep cultivating!",
    time: "1 day ago",
    type: "achievement",
    read: false,
    link: "/profile?focus=realm"
  },
  {
    id: 3,
    title: "Upcoming Airing Reminder",
    desc: "Throne Of Seal Episode 169 airs tomorrow at 09:00 AM",
    time: "1 day ago",
    type: "reminder",
    read: true,
    link: "/calendar"
  },
  {
    id: 4,
    title: "Platform Announcement",
    desc: "AMOLED Black theme is now live! Try it from Appearance settings.",
    time: "2 days ago",
    type: "announcement",
    read: true,
    link: "/profile?focus=appearance"
  }
];

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem("donghua-notifications");
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("donghua-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setIsOpen(false);
    navigate(item.link);
  };

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "episode":
        return <Film className="h-4 w-4 text-donghua-cyan" />;
      case "achievement":
        return <Sparkles className="h-4 w-4 text-donghua-orange" />;
      case "reminder":
        return <Calendar className="h-4 w-4 text-purple-400" />;
      case "announcement":
        return <Mail className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-full hover:bg-white/10 h-10 w-10 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-black animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 sm:w-96 rounded-3xl border border-white/10 bg-popover/90 p-0 shadow-2xl backdrop-blur-xl z-50 overflow-hidden" 
        align="end"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="font-extrabold text-sm sm:text-base text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-primary/20 text-primary border border-primary/25 rounded-full px-2 py-0 text-[10px] font-extrabold">
                {unreadCount} New
              </Badge>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs h-7 rounded-full text-primary hover:text-primary/80 font-bold px-2.5"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
          {notifications.length > 0 ? (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`flex gap-3.5 px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors relative ${
                  !item.read ? "bg-primary/[0.03]" : ""
                }`}
              >
                {/* Dot */}
                {!item.read && (
                  <span className="absolute top-4 left-2.5 h-2 w-2 rounded-full bg-primary" />
                )}
                
                {/* Icon wrapper */}
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className={`text-xs sm:text-sm font-extrabold truncate ${!item.read ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.title}
                    </h4>
                    <span className="text-[9px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 text-center bg-white/[0.01]">
          <p className="text-[10px] text-muted-foreground">
            Browser push notifications placeholder settings enabled.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
