import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageGenerateRequest {
  prompt: string;
  model?: string;
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  background?: 'transparent' | 'opaque' | 'auto';
  contextTitle?: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ImageGenerateRequest = await req.json();
    const { 
      prompt, 
      model = 'gpt-image-1.5', 
      size = '1024x1024',
      quality = 'medium',
      background = 'auto',
      contextTitle
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhance prompt for educational content
    const enhancedPrompt = contextTitle 
      ? `Educational illustration for "${contextTitle}": ${prompt}. Style: Clean, professional, suitable for learning materials.`
      : `${prompt}. Style: Clean, professional, educational illustration.`;

    console.log(`Generating image with model ${model}:`, enhancedPrompt);

    // Call OpenAI Images API (GPT-Image-1.5 parameters)
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: enhancedPrompt,
        n: 1,
        size: size,
        quality: quality,
        background: background,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: 'Image generation failed', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    
    // GPT-Image-1.5 returns b64_json by default, check for both formats
    const imageData = data.data?.[0];
    if (!imageData || (!imageData.url && !imageData.b64_json)) {
      return new Response(
        JSON.stringify({ error: 'No image data returned from API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return URL if available, otherwise return base64 data URL
    const imageUrl = imageData.url || `data:image/png;base64,${imageData.b64_json}`;

    return new Response(
      JSON.stringify({ 
        url: imageUrl,
        model: model,
        prompt: enhancedPrompt
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
