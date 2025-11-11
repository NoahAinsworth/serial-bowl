import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Bunny webhook received:', JSON.stringify(payload, null, 2));

    // Extract video info from webhook
    const videoId = payload.VideoGuid || payload.Guid;
    const status = payload.Status;

    if (!videoId) {
      console.error('No video ID in webhook payload');
      return new Response(JSON.stringify({ error: 'No video ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Bunny status to our status
    let videoStatus = 'processing';
    if (status === 4 || status === 'finished') {
      videoStatus = 'ready';
    } else if (status === 5 || status === 'failed') {
      videoStatus = 'failed';
    }

    const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID')!;

    // Build video URLs
    const videoUrl = videoStatus === 'ready' 
      ? `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`
      : null;
    
    const thumbnailUrl = videoStatus === 'ready'
      ? `https://vz-${libraryId}.b-cdn.net/${videoId}/thumbnail.jpg`
      : null;

    // Update post with video URLs and status
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        video_url: videoUrl,
        video_thumbnail_url: thumbnailUrl,
        video_status: videoStatus,
      })
      .eq('video_bunny_id', videoId);

    if (updateError) {
      console.error('Error updating post:', updateError);
      throw updateError;
    }

    console.log(`Updated video ${videoId} to status ${videoStatus}`);

    return new Response(
      JSON.stringify({ success: true, videoId, status: videoStatus }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in bunny-video-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
