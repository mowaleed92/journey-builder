import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface WrongQuestion {
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

interface RequestBody {
  messages: Message[];
  mode: 'targeted_remediation' | 'open_chat' | 'guided_explanation';
  weakTopics?: string[];
  wrongQuestions?: WrongQuestion[];
  model?: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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

    const body: RequestBody = await req.json();
    const { messages, mode, weakTopics, wrongQuestions, model = 'gpt-4o-mini' } = body;

    let systemPrompt = '';

    switch (mode) {
      case 'targeted_remediation':
        systemPrompt = `You are a helpful learning assistant specializing in personalized education. The student has just completed a quiz and struggled with certain concepts.

${weakTopics?.length ? `Topics they need help with: ${weakTopics.join(', ')}` : ''}

${wrongQuestions?.length ? `Questions they got wrong:
${wrongQuestions.map((q, i) => `${i + 1}. Question: ${q.prompt}\n   Their answer: ${q.userAnswer}\n   Correct answer: ${q.correctAnswer}\n   ${q.explanation ? `Explanation: ${q.explanation}` : ''}`).join('\n\n')}` : ''}

Your role is to:
1. Identify the root misconceptions behind their wrong answers
2. Explain the concepts clearly using simple language and examples
3. Ask follow-up questions to check understanding
4. Be encouraging but honest about what they need to work on
5. Keep responses concise and focused

Do not overwhelm them with information. Address one concept at a time.`;
        break;

      case 'guided_explanation':
        systemPrompt = `You are a patient and clear learning assistant. Your role is to:
1. Break down complex concepts into simple, digestible parts
2. Use analogies and real-world examples
3. Guide the learner through understanding step by step
4. Ask questions to check comprehension
5. Adapt your explanations based on their responses

Keep responses focused and avoid information overload.`;
        break;

      case 'open_chat':
      default:
        systemPrompt = `You are a friendly and knowledgeable learning assistant. You help students understand course material by:
1. Answering questions clearly and concisely
2. Providing relevant examples
3. Suggesting related topics to explore
4. Encouraging curiosity and deeper learning

Be supportive but maintain educational rigor. Keep responses focused.`;
        break;
    }

    const openaiMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter(m => m.role === 'user' || m.role === 'assistant'),
    ];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: openaiMessages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI response', details: errorData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await openaiResponse.json();
    const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return new Response(
      JSON.stringify({ response: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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