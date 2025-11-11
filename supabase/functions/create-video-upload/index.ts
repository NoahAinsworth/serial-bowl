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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, duration, fileSize } = await req.json();

    // Validate limits
    if (duration > 60) {
      return new Response(JSON.stringify({ error: 'Video must be 60 seconds or less' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (fileSize > 104857600) { // 100 MB
      return new Response(JSON.stringify({ error: 'File must be 100 MB or less' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const libraryId = Deno.env.get('BUNNY_STREAM_LIBRARY_ID')!;
    const apiKey = Deno.env.get('BUNNY_STREAM_API_KEY')!;

    // Create video object in Bunny
    const createVideoResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createVideoResponse.ok) {
      console.error('Bunny API error:', await createVideoResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to create video' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const videoData = await createVideoResponse.json();
    const videoId = videoData.guid;

    // Generate TUS signature
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`Video upload initialized for user ${user.id}: ${videoId}`);

    return new Response(
      JSON.stringify({
        videoId,
        libraryId,
        signature,
        expirationTime,
        uploadUrl: 'https://video.bunnycdn.com/tusupload',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-video-upload:', error);
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
