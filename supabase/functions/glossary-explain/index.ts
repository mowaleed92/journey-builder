import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExplainRequest {
  term: string;
  contextSnippet: string;
  trackId?: string;
  moduleId?: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper function to determine the correct token parameter based on model
function getTokenParam(model: string, tokens: number): Record<string, number> {
  // Models that require max_completion_tokens (newer models)
  const useCompletionTokens = 
    model.startsWith('gpt-5') || 
    model.startsWith('gpt-4o') ||
    model.includes('o1') ||
    model.includes('o3');
  
  return useCompletionTokens 
    ? { max_completion_tokens: tokens }
    : { max_tokens: tokens };
}

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

    const body: ExplainRequest = await req.json();
    const { term, contextSnippet, trackId, moduleId } = body;

    if (!term) {
      return new Response(
        JSON.stringify({ error: 'Term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const termNormalized = term.toLowerCase().trim();

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let query = supabase
      .from('glossary_terms')
      .select('arabic_explanation')
      .eq('term_normalized', termNormalized);

    if (trackId) {
      query = query.eq('track_id', trackId);
    } else {
      query = query.is('track_id', null);
    }

    if (moduleId) {
      query = query.eq('module_id', moduleId);
    } else {
      query = query.is('module_id', null);
    }

    const { data: existingTerm } = await query.maybeSingle();

    if (existingTerm) {
      return new Response(
        JSON.stringify({
          explanation: existingTerm.arabic_explanation,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `أنت مساعد تعليمي متخصص في شرح المصطلحات التقنية الإنجليزية للمتعلمين العرب.

مهمتك:
- اشرح المصطلح التقني بالعربية بطريقة بسيطة وواضحة
- ركز على المعنى والسياق، وليس الترجمة الحرفية
- استخدم أمثلة عملية عند الحاجة
- اجعل الشرح قصيراً (2-3 جمل كحد أقصى)
- لا تذكر المصطلح الإنجليزي في الشرح إلا إذا كان ضرورياً

الشرح يجب أن يكون:
- مفهوماً للمبتدئين
- متوافقاً مع السياق المقدم
- عملياً ومفيداً`;

    const userPrompt = `المصطلح: "${term}"

السياق الذي ظهر فيه المصطلح:
"${contextSnippet}"

اشرح هذا المصطلح بالعربية بناءً على السياق أعلاه:`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...getTokenParam('gpt-4o-mini', 200),
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate explanation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    const explanation = data.choices[0]?.message?.content?.trim() || '';

    const { error: insertError } = await supabase
      .from('glossary_terms')
      .insert({
        term: term,
        term_normalized: termNormalized,
        track_id: trackId || null,
        module_id: moduleId || null,
        arabic_explanation: explanation,
        context_snippet: contextSnippet,
      });

    if (insertError) {
      console.error('Error caching glossary term:', insertError);
    }

    return new Response(
      JSON.stringify({
        explanation,
        cached: false
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
