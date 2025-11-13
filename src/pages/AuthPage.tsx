import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { env } from '@/lib/env';
import { SerialBowlLogo } from '@/components/SerialBowlLogo';

export default function AuthPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Redirect if already logged in or handle password recovery
  useEffect(() => {
    // Check if we arrived here via password reset link
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery') {
      setIsResettingPassword(true);
      return;
    }

    // Listen for password recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    if (user && !isResettingPassword) {
      navigate('/');
    }

    return () => subscription.unsubscribe();
  }, [user, navigate]);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in",
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!handle.trim()) {
      toast({
        title: "Handle required",
        description: "Please enter a handle",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          handle: handle.startsWith('@') ? handle : `@${handle}`,
        },
        emailRedirectTo: env.AUTH_REDIRECT,
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Welcome!",
      });
      navigate('/');
    }
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link",
      });
      setShowResetForm(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated!",
        description: "Your password has been successfully changed",
      });
      setIsResettingPassword(false);
      navigate('/home');
    }
    setLoading(false);
  };

  // Show password reset form if arriving from email link
  if (isResettingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-neo-lavender opacity-20 rounded-3xl rotate-12 blur-xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-neo-amber opacity-20 rounded-3xl -rotate-12 blur-xl" />
        
        <Card className="w-full max-w-md p-8 border-[3px] border-border shadow-brutal bg-card">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="inline-block px-6 py-3 bg-neo-lavender rounded-2xl border-[3px] border-border shadow-brutal">
                <SerialBowlLogo 
                  width={160} 
                  className="text-black dark:text-white" 
                />
              </div>
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">Create New Password</h2>
            <p className="text-foreground font-semibold">Enter your new password below</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdatePassword()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUpdatePassword()}
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full bg-neo-pink hover:bg-neo-pink/90 text-black dark:text-white font-bold border-[3px] border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_rgba(255,255,255,0.1)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-neo-pink opacity-20 rounded-3xl rotate-12 blur-xl" />
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-neo-amber opacity-20 rounded-3xl -rotate-12 blur-xl" />
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-neo-lavender opacity-20 rounded-3xl blur-xl" />
      
      <Card className="w-full max-w-md p-8 border-[3px] border-border shadow-brutal bg-card">
        <div className="text-center mb-8">
          {/* Logo/Brand area with colorful background pill */}
          <div className="inline-block px-6 py-3 bg-neo-pink rounded-2xl border-[3px] border-border mb-4 shadow-brutal">
            <SerialBowlLogo 
              width={180} 
              className="text-black dark:text-white" 
            />
          </div>
          <p className="text-foreground font-semibold text-lg">Your bingeing experience awaits!</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted border-[3px] border-border rounded-xl">
            <TabsTrigger 
              value="signin" 
              className="data-[state=active]:bg-neo-pink data-[state=active]:text-black dark:data-[state=active]:text-white font-bold border-[2px] border-transparent data-[state=active]:border-border rounded-lg"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-neo-amber data-[state=active]:text-black dark:data-[state=active]:text-white font-bold border-[2px] border-transparent data-[state=active]:border-border rounded-lg"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSignIn()}
              />
            </div>
            <Button
              onClick={handleSignIn}
              disabled={loading || !email || !password}
              className="w-full bg-neo-pink hover:bg-neo-pink/90 text-black dark:text-white font-bold border-[3px] border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_rgba(255,255,255,0.1)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            {!showResetForm ? (
              <Button
                variant="link"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setShowResetForm(true)}
              >
                Forgot password?
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-neo-baby-blue/30 dark:bg-neo-lavender/20 rounded-lg border-[3px] border-border">
                <div className="space-y-2">
                  <Label className="font-bold">Email for password reset</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordReset()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePasswordReset}
                    disabled={loading || !resetEmail}
                    className="flex-1 bg-neo-amber hover:bg-neo-amber/90 text-black dark:text-white font-bold border-[3px] border-border"
                    size="sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResetForm(false);
                      setResetEmail('');
                    }}
                    className="border-[3px] border-border font-bold"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-handle">Handle</Label>
              <Input
                id="signup-handle"
                type="text"
                placeholder="@yourhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSignUp()}
              />
            </div>
            <Button
              onClick={handleSignUp}
              disabled={loading || !email || !password || !handle}
              className="w-full bg-neo-amber hover:bg-neo-amber/90 text-black dark:text-white font-bold border-[3px] border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_rgba(255,255,255,0.2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_rgba(255,255,255,0.1)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          TV data powered by TheTVDB
        </div>
      </Card>
    </div>
  );
}
