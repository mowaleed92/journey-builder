import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidationRequest {
  question: string;
  userAnswer: string;
  expectedCriteria: string;
  model?: string;
}

interface ValidationResult {
  correct: boolean;
  feedback: string;
  score: number;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: ValidationRequest = await req.json();
    const { question, userAnswer, expectedCriteria, model = 'gpt-4o-mini' } = body;

    if (!question || !userAnswer || !expectedCriteria) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: question, userAnswer, or expectedCriteria' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const systemPrompt = `You are an educational assessment AI. Your job is to evaluate student answers against given criteria.

You must:
1. Carefully compare the student's answer against the expected criteria
2. Be fair but rigorous in evaluation
3. Consider partial correctness
4. Provide constructive, encouraging feedback
5. Give a score from 0-100 based on how well the answer meets the criteria

Always respond with ONLY a valid JSON object in this exact format:
{
  "correct": true/false,
  "feedback": "Your constructive feedback here",
  "score": 0-100
}

A score of 70 or higher is considered correct.`;

    const userPrompt = `Please evaluate the following answer:

**Question/Task:**
${question}

**Expected Criteria:**
${expectedCriteria}

**Student's Answer:**
${userAnswer}

Evaluate how well the student's answer meets the expected criteria. Respond with JSON only.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...getTokenParam(model, 500),
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to evaluate answer', details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await openaiResponse.json();
    let content = data.choices[0]?.message?.content || '';

    // Try to parse the JSON response
    try {
      // Remove any markdown code block markers
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result: ValidationResult = JSON.parse(content);

      // Ensure correct is based on score if not explicitly set
      if (result.score !== undefined && result.correct === undefined) {
        result.correct = result.score >= 70;
      }

      // Ensure all required fields exist
      const validatedResult: ValidationResult = {
        correct: result.correct ?? false,
        feedback: result.feedback || 'Unable to provide specific feedback.',
        score: Math.min(100, Math.max(0, result.score ?? 0)),
      };

      return new Response(
        JSON.stringify(validatedResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      
      // Fallback: try to extract information from the response
      const isCorrect = content.toLowerCase().includes('correct') && !content.toLowerCase().includes('incorrect');
      
      return new Response(
        JSON.stringify({
          correct: isCorrect,
          feedback: 'Your answer has been reviewed. Please check with your instructor for detailed feedback.',
          score: isCorrect ? 75 : 40,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
