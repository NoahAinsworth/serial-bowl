import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, Smile, MessageSquare, Compass, Bot, Library, Settings } from 'lucide-react';
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
    { icon: Smile, label: 'Profile', path: '/profile', showBadge: false, isProfile: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Theme Overlay */}
      <div className="app-overlay" aria-hidden="true"></div>

      {/* Header with safe area support */}
      <header className="sticky top-0 z-40 w-full bg-background" style={{ paddingTop: 'var(--sat, 0px)' }}>
        <div className="container flex h-16 items-center justify-center px-4">
          {theme === 'the_one_with_the_theme' ? (
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
            <img 
              src="/icons/icon-192.png" 
              alt="Serial Bowl" 
              className="h-12 w-12"
            />
          )}
          <div className="absolute right-4 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
              <Library className="h-5 w-5" />
            </Button>
            {/* BingeBot temporarily disabled */}
            {/* <Button variant="ghost" size="icon" onClick={() => setBingeBotOpen(true)} title="Binge Bot AI" className="gap-1.5">
              <Bot className="h-5 w-5" />
              <span className="text-xs font-semibold">AI</span>
            </Button> */}
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

      {/* Bottom Navigation with safe area support */}
      <nav className="sticky bottom-0 z-40 w-full bg-background" style={{ paddingBottom: 'var(--sab, 0px)' }}>
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
              <Icon className="h-6 w-6" />
              {showBadge && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50"></div>
              )}
              <span className="text-xs font-semibold uppercase">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Binge Bot AI - temporarily disabled */}
      {/* <BingeBotAI open={bingeBotOpen} onOpenChange={setBingeBotOpen} /> */}
    </div>
  );
};
