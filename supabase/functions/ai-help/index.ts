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
  language?: string;
  // New context fields
  customSystemPrompt?: string;
  learningObjectives?: string;
  courseMaterialContext?: string;
  subjectDomain?: string;
  globalSystemPrompt?: string;
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

    const body: RequestBody = await req.json();
    const { 
      messages, 
      mode, 
      weakTopics, 
      wrongQuestions, 
      model = 'gpt-4o-mini', 
      language = 'en',
      customSystemPrompt,
      learningObjectives,
      courseMaterialContext,
      subjectDomain,
      globalSystemPrompt
    } = body;

    // Build language instruction based on language code
    const languageInstructions: Record<string, string> = {
      'ar': 'IMPORTANT: You MUST respond in Arabic (العربية). All your responses should be written in Arabic language.',
      'en': 'Respond in English.',
      'es': 'IMPORTANTE: Debes responder en español. Todas tus respuestas deben estar escritas en español.',
      'fr': 'IMPORTANT: Vous devez répondre en français. Toutes vos réponses doivent être écrites en français.',
      'de': 'WICHTIG: Du musst auf Deutsch antworten. Alle deine Antworten sollten auf Deutsch geschrieben sein.',
      'zh': '重要：你必须用中文回答。你的所有回复都应该用中文书写。'
    };
    
    const languageInstruction = languageInstructions[language] || languageInstructions['en'];

    // Build context sections
    const contextSections: string[] = [];
    
    if (subjectDomain) {
      contextSections.push(`Subject Domain: ${subjectDomain}`);
    }
    
    if (learningObjectives) {
      contextSections.push(`Learning Objectives:\n${learningObjectives}`);
    }
    
    if (courseMaterialContext) {
      contextSections.push(`Course Material Context:\n${courseMaterialContext}`);
    }

    // Build the base system prompt - use custom if provided, otherwise use global or default
    let basePrompt = '';
    if (customSystemPrompt) {
      basePrompt = customSystemPrompt;
    } else if (globalSystemPrompt) {
      basePrompt = globalSystemPrompt;
    } else {
      basePrompt = 'You are a helpful, patient, and encouraging learning assistant. Your goal is to help students understand concepts clearly and build their confidence. Always be supportive while maintaining educational rigor.';
    }

    // Build mode-specific instructions
    let modeInstructions = '';
    switch (mode) {
      case 'targeted_remediation':
        modeInstructions = `The student has just completed a quiz and struggled with certain concepts.

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
        modeInstructions = `Your role is to:
1. Break down complex concepts into simple, digestible parts
2. Use analogies and real-world examples
3. Guide the learner through understanding step by step
4. Ask questions to check comprehension
5. Adapt your explanations based on their responses

Keep responses focused and avoid information overload.`;
        break;

      case 'open_chat':
      default:
        modeInstructions = `You help students understand course material by:
1. Answering questions clearly and concisely
2. Providing relevant examples
3. Suggesting related topics to explore
4. Encouraging curiosity and deeper learning

Be supportive but maintain educational rigor. Keep responses focused.`;
        break;
    }

    // Combine all parts into the final system prompt
    const systemPromptParts = [
      languageInstruction,
      '',
      basePrompt,
      '',
      ...(contextSections.length > 0 ? ['--- CONTEXT ---', ...contextSections, ''] : []),
      '--- INSTRUCTIONS ---',
      modeInstructions
    ];
    
    const systemPrompt = systemPromptParts.filter(Boolean).join('\n');

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
        ...getTokenParam(model, 800),
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