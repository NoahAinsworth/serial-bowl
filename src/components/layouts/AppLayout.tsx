import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, MessageSquare, User, TrendingUp, Flame, Users, Clock, Settings, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AppLayoutProps {
  children: ReactNode;
}

function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [unreadDMs, setUnreadDMs] = useState(0);

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

  const mainItems = [
    { title: 'Home', url: '/', icon: Home },
    { title: 'Discover', url: '/discover', icon: Search },
    { title: 'Post', url: '/post', icon: PlusSquare },
    { title: 'Messages', url: '/messages', icon: MessageSquare, badge: unreadDMs },
  ];

  const libraryItems = [
    { title: 'Watchlist', url: '/watchlist', icon: Library },
    { title: 'Profile', url: '/profile', icon: User },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const isCollapsed = state === 'collapsed';
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        {/* User Section */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => navigate('/profile')} className="h-14">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-semibold truncate">{user?.email?.split('@')[0]}</span>
                    <span className="text-xs text-muted-foreground truncate">View Profile</span>
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                      {item.badge && item.badge > 0 && !isCollapsed && (
                        <span className="ml-auto bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-bold">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Library */}
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full">
          {/* Global Header */}
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center gap-4 px-4">
              <SidebarTrigger />
              <h1 className="text-xl font-bold">Serial Bowl</h1>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
