import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, PlusSquare, Bell, User, MessageSquare, Bookmark, TrendingUp, Eye, Settings, List, Compass, Bot, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CerealBowlIcon } from '@/components/CerealBowlIcon';
import { BingeBotAI } from '@/components/BingeBotAI';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [bingeBotOpen, setBingeBotOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: PlusSquare, label: 'Post', path: '/post' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b-2 border-border bg-background">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-wide wordmark gradient-text">
              SERIAL BOWL
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate('/watchlist')} title="Library">
              <Library className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setBingeBotOpen(true)} title="Binge Bot AI" className="gap-1.5">
              <Bot className="h-5 w-5" />
              <span className="text-xs font-semibold">AI</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/activity')} title="Notifications">
              <Bell className="h-5 w-5" />
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
          {navItems.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive(path)
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-6 w-6" />
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
