import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const TVDB_API_KEY = Deno.env.get('TVDB_API_KEY') || '';
const TVDB_BASE_URL = 'https://api4.thetvdb.com/v4';

interface TVDBShow {
  tvdb_id: number;
  name: string;
  overview?: string;
  image_url?: string;
  first_air_time?: string;
}

async function getTVDBToken(): Promise<string> {
  const response = await fetch(`${TVDB_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: TVDB_API_KEY }),
  });
  
  if (!response.ok) {
    throw new Error('TVDB authentication failed');
  }
  
  const data = await response.json();
  return data.data.token;
}

async function fetchNewShows(token: string): Promise<TVDBShow[]> {
  // Fetch recently updated series
  const response = await fetch(`${TVDB_BASE_URL}/updates?since=week&type=series&action=update`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch new shows');
  }
  
  const data = await response.json();
  return (data.data || []).slice(0, 50); // Get top 50 new shows
}

async function fetchPopularShows(token: string): Promise<number[]> {
  // Hardcoded popular show IDs (in a real app, this would come from TVDB trending endpoint)
  return [
    153021, // The Walking Dead
    121361, // Game of Thrones
    78804,  // The Office
    83268,  // Breaking Bad
    295759, // Stranger Things
    81189,  // Friends
    70523,  // How I Met Your Mother
    79349,  // The Big Bang Theory
    305074, // The Boys
    279121, // The Witcher
    294940, // The Mandalorian
    318408, // Ted Lasso
    328437, // The Last of Us
    94605,  // Arcane
    79460,  // Peaky Blinders
    318644, // Wednesday
    73244,  // The Office (US)
    121404, // Succession
  ];
}

async function getShowDetails(token: string, seriesId: number): Promise<TVDBShow | null> {
  try {
    const response = await fetch(`${TVDB_BASE_URL}/series/${seriesId}/extended`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const show = data.data;
    
    return {
      tvdb_id: show.id,
      name: show.name,
      overview: show.overview || '',
      image_url: show.image || '',
      first_air_time: show.firstAired || '',
    };
  } catch (error) {
    console.error(`Failed to fetch show ${seriesId}:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting trending shows update...');
    
    // Get TVDB token
    const token = await getTVDBToken();
    console.log('TVDB authenticated');

    // Fetch new shows
    const newShowsData = await fetchNewShows(token);
    console.log(`Fetched ${newShowsData.length} new shows`);

    // Fetch popular shows
    const popularShowIds = await fetchPopularShows(token);
    console.log(`Processing ${popularShowIds.length} popular shows`);

    // Get details for popular shows
    const popularShowsPromises = popularShowIds.map(id => getShowDetails(token, id));
    const popularShowsData = (await Promise.all(popularShowsPromises)).filter(Boolean) as TVDBShow[];

    // Clear old data
    await supabase.from('tvdb_trending').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new shows
    const newShowsInserts = newShowsData.slice(0, 50).map((show, index) => ({
      category: 'new',
      tvdb_id: show.tvdb_id,
      name: show.name,
      overview: show.overview || '',
      image_url: show.image_url || '',
      first_aired: show.first_air_time || '',
      position: index,
      metadata: show,
    }));

    // Insert popular shows
    const popularShowsInserts = popularShowsData.map((show, index) => ({
      category: 'popular',
      tvdb_id: show.tvdb_id,
      name: show.name,
      overview: show.overview || '',
      image_url: show.image_url || '',
      first_aired: show.first_air_time || '',
      position: index,
      metadata: show,
    }));

    // Batch insert
    const allInserts = [...newShowsInserts, ...popularShowsInserts];
    
    if (allInserts.length > 0) {
      const { error } = await supabase.from('tvdb_trending').insert(allInserts);
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
    }

    console.log(`Updated ${newShowsInserts.length} new shows and ${popularShowsInserts.length} popular shows`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newShows: newShowsInserts.length,
        popularShows: popularShowsInserts.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating trending shows:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
