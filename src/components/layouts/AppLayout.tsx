import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, User, MessageSquare, Compass, Bot, Library, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';
import { BingeBotAI } from '@/components/BingeBotAI';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [bingeBotOpen, setBingeBotOpen] = useState(false);
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadUnreadDMs();
      loadProfile();
      
      // Subscribe to DM updates
      const channel = supabase
        .channel('dm_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dms',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            loadUnreadDMs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadUnreadDMs = async () => {
    if (!user) return;

    const { count } = await supabase
      .from('dms')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);

    setUnreadDMs(count || 0);
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/', showBadge: false },
    { icon: Compass, label: 'Discover', path: '/discover', showBadge: false },
    { icon: PlusSquare, label: 'Post', path: '/post', showBadge: false },
    { icon: MessageSquare, label: 'Messages', path: '/messages', showBadge: unreadDMs > 0 },
    { icon: User, label: 'Profile', path: '/profile', showBadge: false, isProfile: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Theme Overlay */}
      <div className="app-overlay" aria-hidden="true"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {theme === 'friends' ? (
              <h1 className="friends-logo">
                <span>S</span>
                <span className="dot dot-red">·</span>
                <span>E</span>
                <span className="dot dot-yellow">·</span>
                <span>R</span>
                <span className="dot dot-blue">·</span>
                <span>I</span>
                <span className="dot dot-red">·</span>
                <span>A</span>
                <span className="dot dot-yellow">·</span>
                <span>L</span>
                <span className="dot dot-blue">·</span>
                <span>B</span>
                <span className="dot dot-red">·</span>
                <span>O</span>
                <span className="dot dot-yellow">·</span>
                <span>W</span>
                <span className="dot dot-blue">·</span>
                <span>L</span>
              </h1>
            ) : (
              <h1 className="text-xl font-black tracking-wide wordmark gradient-text">
                SERIAL BOWL
              </h1>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
              <Library className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setBingeBotOpen(true)} title="Binge Bot AI" className="gap-1.5">
              <Bot className="h-5 w-5" />
              <span className="text-xs font-semibold">AI</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-40 w-full border-t-2 border-border bg-background">
        <div className="container flex h-16 items-center justify-around px-4">
          {navItems.map(({ icon: Icon, label, path, showBadge, isProfile }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 transition-all relative ${
                isActive(path)
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isProfile && avatarUrl ? (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={avatarUrl} alt="Profile" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Icon className="h-6 w-6" />
              )}
              {showBadge && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50"></div>
              )}
              <span className="text-xs font-semibold uppercase">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Binge Bot AI */}
      <BingeBotAI open={bingeBotOpen} onOpenChange={setBingeBotOpen} />
    </div>
  );
};
