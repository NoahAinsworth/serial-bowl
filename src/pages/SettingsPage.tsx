import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { BingePointsDisplay } from '@/components/BingePointsDisplay';
import { Loader2 } from 'lucide-react';


export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const flags = useFeatureFlags();
  const [profile, setProfile] = useState<any>(null);
  const [recalculating, setRecalculating] = useState(false);
  
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

  const [reportForm, setReportForm] = useState({
    reason: '',
    description: '',
    userOrLink: '',
  });

  const [activeTab, setActiveTab] = useState('preferences');
  const [openAccordion, setOpenAccordion] = useState<string | undefined>();

  // Handle navigation from report action
  useEffect(() => {
    if (location.state?.openTab === 'legal') {
      setActiveTab('legal');
      if (location.state?.scrollTo === 'report') {
        setOpenAccordion('report');
        // Pre-fill report form if data is provided
        if (location.state?.reportData) {
          setReportForm({
            reason: location.state.reportData.reason || '',
            description: location.state.reportData.description || '',
            userOrLink: location.state.reportData.userOrLink || '',
          });
        }
      }
    }
  }, [location.state]);

  useEffect(() => {
    loadSettings();
    loadProfile();
  }, [user]);
  
  const loadProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('binge_points, badge_tier')
      .eq('id', user.id)
      .single();
      
    if (data) {
      setProfile(data);
    }
  };

  const loadSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single();

    if (data?.settings && typeof data.settings === 'object') {
      // Merge loaded settings with defaults to ensure all properties exist
      const loadedSettings = data.settings as any;
      setSettings({
        privacy: {
          private_profile: loadedSettings?.privacy?.private_profile ?? false,
          dm_permission: loadedSettings?.privacy?.dm_permission ?? 'everyone',
          comment_permission: loadedSettings?.privacy?.comment_permission ?? 'everyone',
        },
        safety: {
          hide_spoilers: loadedSettings?.safety?.hide_spoilers ?? true,
          strict_safety: loadedSettings?.safety?.strict_safety ?? false,
        },
        notifications: {
          thoughts: loadedSettings?.notifications?.thoughts ?? true,
          comments: loadedSettings?.notifications?.comments ?? true,
          follows: loadedSettings?.notifications?.follows ?? true,
          dms: loadedSettings?.notifications?.dms ?? true,
        },
      });
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    const { error, data } = await supabase
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
      navigate('/profile');
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

  const recalculateBingePoints = async () => {
    if (!user) return;
    
    setRecalculating(true);
    try {
      await supabase.rpc('update_user_binge_points', {
        p_user_id: user.id
      });
      
      await loadProfile();
      
      toast({
        title: "Success",
        description: "Binge Points recalculated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to recalculate Binge Points",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };
  
  const handleSendReport = () => {
    const subject = encodeURIComponent('Serialbowl Report');
    const body = encodeURIComponent(
      `Reason: ${reportForm.reason}\n\nDescription:\n${reportForm.description}\n\nUsername or Link:\n${reportForm.userOrLink}`
    );
    
    window.location.href = `mailto:serialbowlofficial@gmail.com?subject=${subject}&body=${body}`;
    
    toast({
      title: "Thanks for reporting",
      description: "We'll review this as soon as possible.",
    });

    setReportForm({ reason: '', description: '', userOrLink: '' });
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold neon-glow">Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="legal">Legal & Community</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6 mt-6">

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
              <SelectItem value="light">Light (Neobrutalism)</SelectItem>
              <SelectItem value="dark">Dark (Neobrutalism)</SelectItem>
              <SelectItem value="green_wireframe">Green Wireframe</SelectItem>
              <SelectItem value="static_tv">Static TV</SelectItem>
              <SelectItem value="donut_mode">Donut Mode</SelectItem>
              <SelectItem value="upside_down">Upside Down</SelectItem>
              <SelectItem value="the_one_with_the_theme">The One with the Theme</SelectItem>
              <SelectItem value="upper_east_side">Upper East Side</SelectItem>
              <SelectItem value="neobrutalism">Neobrutalism (Legacy)</SelectItem>
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
            <Label>Filter Mature Content</Label>
            <p className="text-sm text-muted-foreground">Hide posts marked as mature content</p>
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
      
      {/* Binge Points */}
      {flags.BINGE_POINTS && profile && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Binge Points</h2>
          <BingePointsDisplay
            points={profile.binge_points || 0}
            badge={profile.badge_tier || 'Pilot Watcher'}
            showBreakdown
          />
          <Button
            onClick={recalculateBingePoints}
            disabled={recalculating}
            variant="outline"
            className="w-full"
          >
            {recalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recalculating...
              </>
            ) : (
              'Recalculate Binge Points'
            )}
          </Button>
        </Card>
      )}

        <Button onClick={saveSettings} className="w-full btn-glow">
          Save Settings
        </Button>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6 mt-6">
          <Card className="p-6">
            <Accordion type="single" collapsible className="w-full" value={openAccordion} onValueChange={setOpenAccordion}>
              <AccordionItem value="terms">
                <AccordionTrigger className="text-lg font-semibold">Terms of Service</AccordionTrigger>
                <AccordionContent className="space-y-3 text-foreground">
                  <p>By using Serialbowl, you agree not to misuse or exploit the platform.</p>
                  <p>You retain ownership of your posts but grant Serialbowl permission to display and share them publicly within the app.</p>
                  <p>We reserve the right to remove or restrict content that violates these terms or harms the community.</p>
                  <p>Continued use of Serialbowl means you agree to these terms and any future updates.</p>
                  <p>For any questions, contact serialbowlofficial@gmail.com.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="privacy">
                <AccordionTrigger className="text-lg font-semibold">Privacy Policy</AccordionTrigger>
                <AccordionContent className="space-y-3 text-foreground">
                  <p>Serialbowl only collects the information needed to provide core features such as user profiles, ratings, and recommendations.</p>
                  <p>We do not sell or share your personal data with any third parties.</p>
                  <p>You can request account deletion or data export anytime in Settings → Account or by emailing serialbowlofficial@gmail.com.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="guidelines">
                <AccordionTrigger className="text-lg font-semibold">Community Guidelines</AccordionTrigger>
                <AccordionContent className="space-y-3 text-foreground">
                  <p>Serialbowl is designed for respectful, creative TV discussion.</p>
                  <p className="font-semibold">The following actions are strictly prohibited:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Hate speech, racial or ethnic slurs, or discriminatory language targeting gender, sexuality, or religion.</li>
                    <li>Harassment, bullying, or threats.</li>
                    <li>Posting sexually explicit, violent, or hateful content.</li>
                    <li>Impersonation, spam, or spreading misinformation.</li>
                  </ul>
                  <p>Violations can lead to warnings, suspensions, or bans.</p>
                  <p>Our goal is to keep Serialbowl a safe and welcoming place for everyone.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="report">
                <AccordionTrigger className="text-lg font-semibold">Report Content or User</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground">
                  <div className="space-y-2">
                    <Label>Reason for report</Label>
                    <Select value={reportForm.reason} onValueChange={(value) => setReportForm(prev => ({ ...prev, reason: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hate_speech">Hate Speech</SelectItem>
                        <SelectItem value="harassment">Harassment</SelectItem>
                        <SelectItem value="explicit_content">Explicit Content</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Describe what happened</Label>
                    <Textarea
                      value={reportForm.description}
                      onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please provide details about the issue..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Username or link involved (optional)</Label>
                    <Textarea
                      value={reportForm.userOrLink}
                      onChange={(e) => setReportForm(prev => ({ ...prev, userOrLink: e.target.value }))}
                      placeholder="@username or link to content"
                      rows={2}
                    />
                  </div>

                  <Button onClick={handleSendReport} className="w-full" disabled={!reportForm.reason || !reportForm.description}>
                    Send Report
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                Serialbowl is an independent project by Noah Ainsworth. All app content and policies are currently in development.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
