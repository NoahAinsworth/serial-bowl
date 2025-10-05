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
...
    </Card>

      <Button onClick={saveSettings} className="w-full btn-glow">
        Save Settings
      </Button>
    </div>
  );
}
