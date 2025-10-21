import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, MessageSquare, Smile, Search, Settings, Library, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SkyClouds from '@/components/SkyClouds';
import { useTheme } from '@/contexts/ThemeContext';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadUnreadDMs();

      const channel = supabase
        .channel('dm_notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'dms',
          filter: `recipient_id=eq.${user.id}`,
        }, () => loadUnreadDMs())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  };

  const loadUnreadDMs = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('dms')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);
    setUnreadDMs(count || 0);
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Discover', path: '/discover' },
    { icon: PlusSquare, label: 'Post', path: '/post' },
    { icon: MessageSquare, label: 'Messages', path: '/messages', showDot: unreadDMs > 0 },
    { icon: Smile, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <div className="app-scroll">
        <div className="flex flex-col min-h-screen bg-transparent relative z-10">
        {/* Header */}
        <header className="app-header sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/70" style={{ paddingTop: 'var(--safe-top)' }}>
          <div className="flex h-14 items-center justify-between px-4">
            {theme === 'the_one_with_the_theme' ? (
              <h1 className="wordmark friends-wordmark">
                {Array.from('SERIAL BOWL').map((char, i, arr) => (
                  <span key={i}>
                    <span className="letter">{char}</span>
                    {i < arr.length - 1 && <span className="dot">•</span>}
                  </span>
                ))}
              </h1>
            ) : theme === 'upper_east_side' ? (
              <h1 className="wordmark upper-east-wordmark">
                <span className="xoxo-text">xoxo,&nbsp;</span>
                <span className="brand-text">Serial Bowl</span>
              </h1>
            ) : (
              <h1 className="wordmark">Serial Bowl</h1>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
                <Library className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/binge-board')} title="Binge Board">
                <Trophy className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="nav sticky bottom-0 z-40 border-t bg-background/80" style={{ paddingBottom: 'var(--safe-bottom)' }}>
          <div className="flex h-16 items-center justify-around px-2">
            {navItems.map(({ icon: Icon, label, path, showDot }) => (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 transition-all relative px-3 py-2 rounded-lg ${
                  isActive(path)
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {showDot && (
                    <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></div>
                  )}
                </div>
                <span className="text-xs">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
        </div>
      </div>
      <div className="background">
        <SkyClouds count={8} />
      </div>
    </>
  );
};
