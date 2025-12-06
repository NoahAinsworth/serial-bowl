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
      .select('settings, is_private')
      .eq('id', user.id)
      .single();

    if (data?.settings && typeof data.settings === 'object') {
      // Merge loaded settings with defaults to ensure all properties exist
      const loadedSettings = data.settings as any;
      setSettings({
        privacy: {
          private_profile: loadedSettings?.privacy?.private_profile ?? data.is_private ?? false,
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

  const updateSetting = async (category: string, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category as keyof typeof settings],
        [key]: value,
      },
    };
    
    setSettings(newSettings);
    
    // Auto-save to database immediately
    if (!user) return;
    
    // Update settings JSON
    const updateData: any = { settings: newSettings };
    
    // Also update is_private field if privacy.private_profile is changed
    if (category === 'privacy' && key === 'private_profile') {
      updateData.is_private = value;
    }
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);
    
    if (error) {
      console.error('Failed to save setting:', error);
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive",
      });
    } else {
      // Show subtle feedback that setting was saved
      toast({
        title: "Saved",
        description: "Setting updated",
        duration: 2000,
      });
    }
  };

  
  const handleSendReport = () => {
    const subject = encodeURIComponent('serial bowl™ Report');
    const body = encodeURIComponent(
      `Reason: ${reportForm.reason}\n\nDescription:\n${reportForm.description}\n\nUsername or Link:\n${reportForm.userOrLink}`
    );
    
    window.location.href = `mailto:contact@theserialbowl.com?subject=${subject}&body=${body}`;
    
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
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="green_wireframe">Green Wireframe</SelectItem>
              <SelectItem value="static_tv">Static TV</SelectItem>
              <SelectItem value="donut_mode">Donut Mode</SelectItem>
              <SelectItem value="upside_down">Upside Down</SelectItem>
              <SelectItem value="the_one_with_the_theme">The One with the Theme</SelectItem>
              <SelectItem value="upper_east_side">Upper East Side</SelectItem>
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
        </Card>
      )}

        <Button onClick={() => navigate('/profile')} className="w-full btn-glow">
          Done
        </Button>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6 mt-6">
          <Card className="p-6">
            <Accordion type="single" collapsible className="w-full" value={openAccordion} onValueChange={setOpenAccordion}>
              <AccordionItem value="terms">
                <AccordionTrigger className="text-lg font-semibold">Terms of Service</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground text-sm">
                  <p className="text-muted-foreground italic">Last updated: January 2025</p>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">1. Introduction</h3>
                    <p>Welcome to <strong>serial bowl™</strong> ("we," "us," "our"). serial bowl™ is a social TV-tracking app owned and operated by Noah Ainsworth. These Terms govern your use of the app. By using serial bowl™, you agree to these Terms.</p>
                    <p className="text-xs text-muted-foreground italic">Trademark note: "serial bowl™" is used as a common-law trademark. Registration pending.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">2. Eligibility</h3>
                    <p>You must be at least <strong>13 years old</strong> to use serial bowl™. If you are under 18, you may only use the app with parental or guardian permission.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">3. Your Account</h3>
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Securing your login credentials</li>
                      <li>All activity under your account</li>
                      <li>Not impersonating other users</li>
                      <li>Not abusing platform features</li>
                    </ul>
                    <p>We may suspend or terminate accounts that violate these Terms.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">4. User-Generated Content</h3>
                    <p>You may post thoughts, reviews, ratings, comments, profile information, DMs, and external video links. You own the content you create.</p>
                    <p>By posting, you give serial bowl™ a <strong>non-exclusive, worldwide, royalty-free license</strong> to display and distribute your content within the app.</p>
                    <p>You agree that you will not post prohibited material, violate copyright laws, or upload videos (links only). We may remove harmful or illegal content.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">5. External Video Links</h3>
                    <p>serial bowl™ only supports <strong>links</strong> to videos (YouTube, TikTok, IG, Vimeo, etc.). serial bowl™ does <strong>NOT</strong> host or store videos. All linked content follows the rules of the platforms they come from.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">6. Intellectual Property</h3>
                    <p>serial bowl™, its design, UI, graphics, branding, icons, characters (including "BingeBot"), and features are the property of Noah Ainsworth.</p>
                    <p>You are prohibited from:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Copying the serial bowl™ brand</li>
                      <li>Using the serial bowl™ name, likeness, BingeBot, or UI without permission</li>
                      <li>Reverse engineering or creating derivative works</li>
                      <li>Reposting the app's content</li>
                    </ul>
                    <p className="font-semibold">Trademark Notice: serial bowl™ and BingeBot™ are claimed as common-law trademarks. All rights reserved.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">7. AI Assistant (BingeBot)</h3>
                    <p>serial bowl™ contains an AI assistant called <strong>BingeBot™</strong>.</p>
                    
                    <div className="space-y-2">
                      <p className="font-semibold">BingeBot can:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Answer TV-related questions</li>
                        <li>Provide actor, character, and episode info</li>
                        <li>Recommend shows</li>
                        <li>Navigate to any show/season/episode</li>
                        <li>Apply ratings on behalf of the user when explicitly asked</li>
                        <li>Refuse non-TV questions</li>
                        <li>Decline harmful requests</li>
                        <li>Provide spoiler warnings</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">BingeBot CANNOT:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Provide legal, medical, political, or personal advice</li>
                        <li>Engage in non-TV conversations</li>
                        <li>Reveal private or personal information</li>
                        <li>Replace professional guidance</li>
                        <li>Guarantee factual accuracy</li>
                        <li>Perform irreversible actions without user confirmation</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">AI Rating Actions:</p>
                      <p>If the user asks BingeBot to rate content, BingeBot will: (1) Identify the show/season/episode, (2) Identify rating value (0–100), (3) Request confirmation, (4) Save the rating using the same logic as manual user input. Users are responsible for ratings applied through BingeBot.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">8. Use of AI & Data Handling</h3>
                    <p>serial bowl™ uses <strong>Google Gemini</strong> for general TV information retrieval. Gemini is used ONLY for TV metadata, show summaries, actor data, character info, and episode descriptions.</p>
                    <p className="font-semibold">serial bowl™ never sends personal data, DMs, posts, reviews, ratings, watch history, or private content to Gemini or any external AI.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">9. Privacy</h3>
                    <p>Your data is protected. See our <strong>Privacy Policy</strong> for full details.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">10. Prohibited Behavior</h3>
                    <p>You may not:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Harass or threaten others</li>
                      <li>Post hate speech</li>
                      <li>Share explicit content</li>
                      <li>Engage in copyright infringement</li>
                      <li>Attempt to misuse BingeBot</li>
                      <li>Use serial bowl™ for anything outside TV purposes</li>
                      <li>Post illegal or harmful content</li>
                      <li>Attempt to hack or exploit the app</li>
                      <li>Attempt to bypass moderation</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">11. Termination</h3>
                    <p>We may terminate accounts for violations. You may delete your account at any time.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">12. Disclaimer</h3>
                    <p>serial bowl™ is provided "as is." We do not guarantee accuracy or uptime. BingeBot™ responses may contain errors. Use at your own risk.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">13. Limitation of Liability</h3>
                    <p>To the maximum extent allowed by law, serial bowl™ is not liable for user behavior, AI responses, data loss, third-party platforms, linked content, or damages from app use.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">14. Governing Law</h3>
                    <p>These Terms follow the laws of the United States.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">15. Contact</h3>
                    <p>For support or legal concerns: <strong>contact@theserialbowl.com</strong></p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="privacy">
                <AccordionTrigger className="text-lg font-semibold">Privacy Policy</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground text-sm">
                  <p className="text-muted-foreground italic">Last updated: January 2025</p>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">1. Overview</h3>
                    <p>serial bowl™ ("we," "our") respects your privacy. This policy explains what we collect and how we protect it.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">2. Information We Collect</h3>
                    <div className="space-y-2">
                      <p className="font-semibold">You provide:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Email, username, avatar, bio</li>
                        <li>Posts, reviews, ratings, comments</li>
                        <li>Watchlist & watched history</li>
                        <li>DMs and settings</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold">Automatically collected:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Device info, error logs</li>
                        <li>App usage and navigation events</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">3. What We DO NOT Collect</h3>
                    <p>serial bowl™ does <strong>NOT</strong> collect or store:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Phone numbers or addresses</li>
                      <li>Payment information</li>
                      <li>Camera roll media or videos</li>
                      <li>Sensitive demographic data or ID documents</li>
                      <li>Cookies from advertisers</li>
                      <li>Personal data sent to Gemini</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">4. How We Use Data</h3>
                    <p>We use your data to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Maintain your account</li>
                      <li>Display your posts</li>
                      <li>Sync ratings & watch history</li>
                      <li>Operate BingeBot™ safely</li>
                      <li>Personalize the app and improve features</li>
                    </ul>
                    <p className="font-semibold">We do not sell your personal data.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">5. External Services</h3>
                    <p><strong>Supabase:</strong> Handles auth, storage, and real-time data.</p>
                    <p><strong>Gemini:</strong> Used ONLY to retrieve public TV metadata. We do not send private user data to Gemini.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">6. Data Security</h3>
                    <p>Supabase uses encrypted storage. Your data is protected.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">7. Your Rights</h3>
                    <p>You may:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Edit your data</li>
                      <li>Delete your account</li>
                      <li>Export your data</li>
                      <li>Adjust privacy settings</li>
                      <li>Block users and report content</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">8. Children's Privacy</h3>
                    <p>Not intended for users under 13.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">9. Contact</h3>
                    <p><strong>contact@theserialbowl.com</strong></p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="guidelines">
                <AccordionTrigger className="text-lg font-semibold">Community Guidelines</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground text-sm">
                  <p>Users must:</p>

                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold">✔ Be respectful</p>
                      <p className="text-muted-foreground">No harassment, abuse, or hate.</p>
                    </div>

                    <div>
                      <p className="font-semibold">✔ Post responsibly</p>
                      <p className="text-muted-foreground">No graphic violence, sexual content, or dangerous acts.</p>
                    </div>

                    <div>
                      <p className="font-semibold">✔ Use spoiler tags</p>
                      <p className="text-muted-foreground">Major plot points must be flagged.</p>
                    </div>

                    <div>
                      <p className="font-semibold">✔ Avoid spam</p>
                      <p className="text-muted-foreground">No mass advertising or scams.</p>
                    </div>

                    <div>
                      <p className="font-semibold">✔ Follow copyright rules</p>
                      <p className="text-muted-foreground">Links only; no uploads.</p>
                    </div>

                    <div>
                      <p className="font-semibold">✔ Keep BingeBot safe</p>
                      <p className="text-muted-foreground">Do not prompt it to produce harmful content.</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground">Violations can lead to warnings, suspensions, or bans. Our goal is to keep serial bowl™ a safe and welcoming place for everyone.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="spoiler-mature">
                <AccordionTrigger className="text-lg font-semibold">Spoiler & Mature Content Policy</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground text-sm">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Spoilers</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Must be tagged</li>
                      <li>BingeBot must warn before revealing them</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Mature Content</h3>
                    <p>Allowed only if labeled; must not include:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Sexual content with minors</li>
                      <li>Graphic violence</li>
                      <li>Criminal acts</li>
                      <li>Abuse</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="copyright">
                <AccordionTrigger className="text-lg font-semibold">Copyright & DMCA Policy</AccordionTrigger>
                <AccordionContent className="space-y-4 text-foreground text-sm">
                  <p>You may only post content you have rights to.</p>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Not allowed:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Uploading copyrighted media</li>
                      <li>Posting full scenes</li>
                      <li>Posting copyrighted images you do not own</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Allowed:</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Links to third-party videos</li>
                      <li>Quotes within fair use</li>
                      <li>Original reviews</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-base">Takedown Requests:</h3>
                    <p>Email: <strong>contact@theserialbowl.com</strong></p>
                    <p>Subject: "DMCA Request"</p>
                    <p>Include ownership proof.</p>
                  </div>
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
                serial bowl™ is an independent project by Noah Ainsworth. Policies may be updated.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
