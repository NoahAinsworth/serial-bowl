// v3.0 - Added video upload support
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PercentRating } from '@/components/PercentRating';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Film, X } from 'lucide-react';
import { createThought } from '@/api/posts';
import { supabase } from '@/api/supabase';
import { replaceProfanity } from '@/utils/profanityFilter';
import * as tus from 'tus-js-client';

interface PostCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postType: 'review' | 'thought';
  itemType?: 'show' | 'season' | 'episode';
  itemId?: string;
  contentTitle: string;
  onSuccess?: () => void;
}

export function PostCreationDialog({
  open,
  onOpenChange,
  postType,
  itemType,
  itemId,
  contentTitle,
  onSuccess,
}: PostCreationDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(50);
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [hasMature, setHasMature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'failed'>('idle');
  const [videoBunnyId, setVideoBunnyId] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/mp4')) {
      toast.error('Please select an MP4 video file');
      return;
    }

    // Validate file size (100 MB)
    if (file.size > 104857600) {
      toast.error('⚠️ File too large (100 MB max)');
      return;
    }

    // Load video to check duration
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    
    videoEl.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoEl.src);
      
      if (videoEl.duration > 60) {
        toast.error('⚠️ Video must be 60 seconds or less');
        return;
      }

      setVideoDuration(Math.floor(videoEl.duration));
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoStatus('idle');
    };

    videoEl.src = URL.createObjectURL(file);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setVideoStatus('idle');
    setUploadProgress(0);
    setVideoBunnyId(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const uploadVideo = async (): Promise<string | null> => {
    if (!videoFile || !user) return null;

    try {
      setVideoStatus('uploading');
      
      // Call edge function to initialize upload
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('create-video-upload', {
        body: {
          title: `Video by ${user.email} - ${new Date().toISOString()}`,
          duration: videoDuration,
          fileSize: videoFile.size,
        },
      });

      if (uploadError) throw uploadError;

      const { videoId, libraryId, signature, expirationTime, uploadUrl } = uploadData;
      setVideoBunnyId(videoId);

      // Upload via TUS
      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(videoFile, {
          endpoint: uploadUrl,
          metadata: {
            library: libraryId,
            videoId: videoId,
          },
          headers: {
            'AuthorizationSignature': signature,
            'AuthorizationExpire': String(expirationTime),
            'VideoId': videoId,
            'LibraryId': libraryId,
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.floor((bytesUploaded / bytesTotal) * 100);
            setUploadProgress(percentage);
          },
          onSuccess: () => {
            setVideoStatus('processing');
            resolve(videoId);
          },
          onError: (error) => {
            console.error('TUS upload error:', error);
            setVideoStatus('failed');
            reject(error);
          },
        });

        upload.start();
      });
    } catch (error) {
      console.error('Video upload error:', error);
      setVideoStatus('failed');
      toast.error('Failed to upload video');
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to post');
      return;
    }

    if (postType === 'thought' && !text.trim() && !videoFile) {
      toast.error('Please write something or add a video');
      return;
    }

    if (postType === 'review' && !text.trim() && !rating) {
      toast.error('Please add a rating or write a review');
      return;
    }

    setSubmitting(true);

    try {
      let uploadedVideoId: string | null = null;
      
      // Upload video first if present
      if (videoFile) {
        uploadedVideoId = await uploadVideo();
        if (!uploadedVideoId) {
          toast.error('Video upload failed');
          setSubmitting(false);
          return;
        }
      }

      if (postType === 'review' && itemType && itemId) {
        const cleanedText = text.trim() ? replaceProfanity(text.trim()) : null;
        
        const { data, error } = await supabase.rpc('api_rate_and_review', {
          p_item_type: itemType,
          p_item_id: itemId,
          p_score_any: String(rating),
          p_review: cleanedText,
          p_is_spoiler: hasSpoilers,
        });

        if (error) throw error;

        // If video, update the post with video info
        if (uploadedVideoId && data && Array.isArray(data) && data[0]?.post_id) {
          await supabase
            .from('posts')
            .update({
              video_bunny_id: uploadedVideoId,
              video_status: 'processing',
              video_duration: videoDuration,
              video_file_size: videoFile?.size,
            })
            .eq('id', data[0].post_id);
        }

        toast.success(uploadedVideoId ? '✅ Posted successfully – video processing may take a moment' : 'Review posted!');
      } else {
        const thoughtData = await createThought({ 
          body: text.trim() || 'Video post', 
          hasSpoilers, 
          hasMature,
          itemType,
          itemId,
        });

        // Update with video info if present
        if (uploadedVideoId && thoughtData) {
          await supabase
            .from('posts')
            .update({
              video_bunny_id: uploadedVideoId,
              video_status: 'processing',
              video_duration: videoDuration,
              video_file_size: videoFile?.size,
            })
            .eq('id', thoughtData.id);
        }

        toast.success(uploadedVideoId ? '✅ Posted successfully – video processing may take a moment' : 'Thought posted!');
      }

      setText('');
      setRating(50);
      setHasSpoilers(false);
      setHasMature(false);
      handleRemoveVideo();
      onOpenChange(false);
      onSuccess?.();
      
      navigate('/home', { state: { scrollToTop: true } });
    } catch (error: any) {
      toast.error(error.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {postType === 'review' ? 'Write a Review' : 'Share a Thought'}
          </DialogTitle>
          <DialogDescription>{contentTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {postType === 'review' && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Rating</p>
              <PercentRating initialRating={rating} onRate={setRating} compact />
            </div>
          )}

          <div>
            <Textarea
              placeholder={postType === 'review' ? 'Write your review...' : 'Share your thoughts...'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
          </div>

          {/* Video Upload Section */}
          <div className="space-y-2">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4"
              onChange={handleVideoSelect}
              className="hidden"
            />
            
            {!videoFile ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => videoInputRef.current?.click()}
              >
                <Film className="mr-2 h-4 w-4" />
                🎬 Add video (1 minute max)
              </Button>
            ) : (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {videoPreview && (
                    <video
                      src={videoPreview}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{videoFile.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleRemoveVideo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {formatDuration(videoDuration)}
                      </Badge>
                      <span>•</span>
                      <span>{(videoFile.size / 1048576).toFixed(1)} MB</span>
                    </div>
                    
                    {videoStatus !== 'idle' && (
                      <div className="mt-2">
                        {videoStatus === 'uploading' && (
                          <>
                            <Progress value={uploadProgress} className="h-1 mb-1" />
                            <p className="text-xs text-muted-foreground">Uploading… {uploadProgress}%</p>
                          </>
                        )}
                        {videoStatus === 'processing' && (
                          <Badge variant="secondary">Processing…</Badge>
                        )}
                        {videoStatus === 'failed' && (
                          <Badge variant="destructive">Upload failed</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  ⚠️ 1 minute max · 100 MB max · H.264/AAC recommended
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="spoiler"
                checked={hasSpoilers}
                onCheckedChange={(checked) => setHasSpoilers(checked as boolean)}
              />
              <Label htmlFor="spoiler" className="text-sm">
                This contains spoilers
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mature"
                checked={hasMature}
                onCheckedChange={(checked) => setHasMature(checked as boolean)}
              />
              <Label htmlFor="mature" className="text-sm">
                🔞 This contains mature content
              </Label>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post {postType === 'review' ? 'Review' : 'Thought'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
