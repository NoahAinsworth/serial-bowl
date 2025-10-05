import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';


export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    privacy: {
      private_profile: false,
      dm_permission: 'everyone',
      comment_permission: 'everyone',
    },
    safety: {
      hide_spoilers: true,
      strict_safety: false,
    },
    notifications: {
      thoughts: true,
      comments: true,
      follows: true,
      dms: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    if (data?.settings) {
      setSettings(data.settings);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ settings })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    }
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold neon-glow">Settings</h1>

      {/* Appearance */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="retro">Retro (CRT Mode)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Privacy */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Privacy</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <Label>Private Profile</Label>
            <p className="text-sm text-muted-foreground">Only followers can see your activity</p>
          </div>
          <Switch
            checked={settings.privacy.private_profile}
            onCheckedChange={(checked) => updateSetting('privacy', 'private_profile', checked)}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Who can send you DMs</Label>
          <Select
            value={settings.privacy.dm_permission}
            onValueChange={(value) => updateSetting('privacy', 'dm_permission', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="following">People you follow</SelectItem>
              <SelectItem value="none">No one</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Who can comment on your thoughts</Label>
          <Select
            value={settings.privacy.comment_permission}
            onValueChange={(value) => updateSetting('privacy', 'comment_permission', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="following">People you follow</SelectItem>
              <SelectItem value="none">No one</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Safety */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Safety</h2>
        
        <div className="flex items-center justify-between">
          <div>
            <Label>Hide Spoilers</Label>
            <p className="text-sm text-muted-foreground">Blur spoiler content by default</p>
          </div>
          <Switch
            checked={settings.safety.hide_spoilers}
            onCheckedChange={(checked) => updateSetting('safety', 'hide_spoilers', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Strict Safety Mode</Label>
            <p className="text-sm text-muted-foreground">Additional content filtering</p>
          </div>
          <Switch
            checked={settings.safety.strict_safety}
            onCheckedChange={(checked) => updateSetting('safety', 'strict_safety', checked)}
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Notifications</h2>
        
        <div className="flex items-center justify-between">
          <Label>Thoughts</Label>
          <Switch
            checked={settings.notifications.thoughts}
            onCheckedChange={(checked) => updateSetting('notifications', 'thoughts', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Comments</Label>
          <Switch
            checked={settings.notifications.comments}
            onCheckedChange={(checked) => updateSetting('notifications', 'comments', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Follows</Label>
          <Switch
            checked={settings.notifications.follows}
            onCheckedChange={(checked) => updateSetting('notifications', 'follows', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Direct Messages</Label>
          <Switch
            checked={settings.notifications.dms}
            onCheckedChange={(checked) => updateSetting('notifications', 'dms', checked)}
          />
        </div>
      </Card>

      <Button onClick={saveSettings} className="w-full btn-glow">
        Save Settings
      </Button>
    </div>
  );
}
