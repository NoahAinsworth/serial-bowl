import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, PlusSquare, MessageSquare, User, Search, Settings, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createThought } from '@/api/posts';
import { toast } from 'sonner';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadDMs, setUnreadDMs] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [thoughtText, setThoughtText] = useState('');
  const [posting, setPosting] = useState(false);

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

  const handleQuickThought = async (text: string) => {
    if (!text.trim() || posting) return;
    
    setPosting(true);
    try {
      await createThought({ body: text });
      toast.success('Posted!');
      setThoughtText('');
      window.location.reload(); // Simple refresh to show new post
    } catch (error) {
      toast.error('Failed to post thought');
      console.error(error);
    } finally {
      setPosting(false);
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    await handleQuickThought(emoji);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Pour a Thought Bar */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Pour a thought about TV… 🧠"
            value={thoughtText}
            onChange={(e) => setThoughtText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickThought(thoughtText);
              }
            }}
            disabled={posting}
            className="flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('🔥')}
            disabled={posting}
            title="Fire"
          >
            🔥
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('😂')}
            disabled={posting}
            title="Laugh"
          >
            😂
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('🤯')}
            disabled={posting}
            title="Mind Blown"
          >
            🤯
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('😭')}
            disabled={posting}
            title="Cry"
          >
            😭
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEmojiClick('❤️')}
            disabled={posting}
            title="Heart"
          >
            ❤️
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
            <Library className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Settings">
            <Settings className="h-5 w-5" />
          </Button>
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
