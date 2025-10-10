import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function LegalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [userOrLink, setUserOrLink] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    report: false
  });

  useEffect(() => {
    const state = location.state as any;
    if (state?.openReport) {
      setOpenSections(prev => ({ ...prev, report: true }));
      if (state.reportUser) {
        setUserOrLink(`@${state.reportUser}`);
      }
      if (state.reportContent) {
        setDescription(state.reportContent.substring(0, 500));
      }
    }
  }, [location.state]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSendReport = () => {
    const subject = encodeURIComponent('Serialbowl Report');
    const body = encodeURIComponent(
      `Reason: ${reason}\n\nDescription:\n${description}\n\nUsername or Link:\n${userOrLink}`
    );
    window.location.href = `mailto:serialbowlofficial@gmail.com?subject=${subject}&body=${body}`;
    
    toast({
      title: "Thanks for reporting",
      description: "We'll review this as soon as possible.",
    });
    
    // Clear form
    setReason('');
    setDescription('');
    setUserOrLink('');
  };

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Legal & Community</h1>
      </div>

      {/* Terms of Service */}
      <Collapsible open={openSections.tos} onOpenChange={() => toggleSection('tos')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer touch-manipulation min-h-[60px]">
              <div className="flex items-center justify-between">
                <CardTitle>Terms of Service</CardTitle>
                {openSections.tos ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <p>By using Serialbowl, you agree not to exploit the platform or use it for malicious purposes.</p>
              <p>You retain ownership of all content you post, but grant Serialbowl the right to display it publicly on the platform.</p>
              <p>We reserve the right to remove any content that violates our community standards without prior notice.</p>
              <p>For questions, contact: <a href="mailto:serialbowlofficial@gmail.com" className="text-primary underline">serialbowlofficial@gmail.com</a></p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Privacy Policy */}
      <Collapsible open={openSections.privacy} onOpenChange={() => toggleSection('privacy')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer touch-manipulation min-h-[60px]">
              <div className="flex items-center justify-between">
                <CardTitle>Privacy Policy</CardTitle>
                {openSections.privacy ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <p>We collect only minimal data necessary for your profile, ratings, and recommendations.</p>
              <p>Your data is never sold or shared with third parties.</p>
              <p>You can request to delete or export your data by emailing: <a href="mailto:serialbowlofficial@gmail.com" className="text-primary underline">serialbowlofficial@gmail.com</a></p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Community Guidelines */}
      <Collapsible open={openSections.guidelines} onOpenChange={() => toggleSection('guidelines')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer touch-manipulation min-h-[60px]">
              <div className="flex items-center justify-between">
                <CardTitle>Community Guidelines</CardTitle>
                {openSections.guidelines ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 text-sm">
              <p className="font-semibold">The following are prohibited on Serialbowl:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Hate speech, slurs, or discriminatory language</li>
                <li>Harassment, bullying, or targeted attacks</li>
                <li>Explicit sexual content or violent material</li>
                <li>Impersonation of others</li>
                <li>Spam or unsolicited advertising</li>
                <li>Misinformation or intentionally misleading content</li>
              </ul>
              <p>Violations may result in warnings, temporary suspensions, or permanent bans depending on severity.</p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Report Content or User */}
      <Collapsible open={openSections.report} onOpenChange={() => toggleSection('report')}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer touch-manipulation min-h-[60px]">
              <div className="flex items-center justify-between">
                <CardTitle>Report Content or User</CardTitle>
                <CardDescription>Help keep Serialbowl safe</CardDescription>
                {openSections.report ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" className="touch-manipulation min-h-[44px]">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    <SelectItem value="hate">Hate Speech</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="explicit">Explicit Content</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe what happened</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="touch-manipulation min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userOrLink">Username or link (optional)</Label>
                <Input
                  id="userOrLink"
                  placeholder="@username or link"
                  value={userOrLink}
                  onChange={(e) => setUserOrLink(e.target.value)}
                  className="touch-manipulation min-h-[44px]"
                />
              </div>

              <Button
                onClick={handleSendReport}
                disabled={!reason || !description}
                className="w-full touch-manipulation min-h-[44px]"
              >
                Send Report
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground text-center">
          <p>Serialbowl is an independent project by Noah Ainsworth.</p>
          <p className="mt-2">All content and policies are currently in development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
