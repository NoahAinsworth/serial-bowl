import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, MessageSquare, User, Search, Settings, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    { icon: MessageSquare, label: 'Messages', path: '/messages', badge: unreadDMs },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
              <Library className="h-5 w-5" />
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
      <nav className="sticky bottom-0 z-40 border-t bg-background">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map(({ icon: Icon, label, path, badge }) => (
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
                {badge && badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                    {badge}
                  </div>
                )}
              </div>
              <span className="text-xs">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};
