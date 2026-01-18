import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GraphDefinition {
  startBlockId: string;
  blocks: Array<{
    id: string;
    type: string;
    content: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    condition?: unknown;
    priority?: number;
  }>;
}

interface GenerateRequest {
  type: 'outline' | 'content' | 'quiz' | 'video_script';
  topic: string;
  targetAudience?: string;
  difficulty?: string;
  duration?: number;
  blockCount?: number;
  includeVideo?: boolean;
  includeQuiz?: boolean;
  existingContent?: string;
  existingGraph?: GraphDefinition;
  enableWebResearch?: boolean;
  model?: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');

async function searchWeb(query: string, maxResults = 5): Promise<string> {
  if (!TAVILY_API_KEY) {
    console.log('Tavily API key not configured, skipping web research');
    return '';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      console.error('Tavily search failed:', await response.text());
      return '';
    }

    const data: TavilyResponse = await response.json();

    let researchContext = '\n\nWEB RESEARCH RESULTS:\n';
    researchContext += 'The following is current information from the web about this topic:\n\n';

    if (data.answer) {
      researchContext += `Summary: ${data.answer}\n\n`;
    }

    if (data.results && data.results.length > 0) {
      researchContext += 'Key Sources:\n';
      data.results.forEach((result, index) => {
        researchContext += `${index + 1}. ${result.title}\n`;
        researchContext += `   ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}\n\n`;
      });
    }

    researchContext += '\nIMPORTANT: Use this research to ensure the generated content is accurate, up-to-date, and reflects current best practices. Cite specific facts where relevant.\n';

    return researchContext;
  } catch (error) {
    console.error('Web search error:', error);
    return '';
  }
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

    const body: GenerateRequest = await req.json();
    const { type, topic, targetAudience, difficulty, duration, blockCount, includeVideo, includeQuiz, existingContent, existingGraph, enableWebResearch = true, model = 'gpt-4o' } = body;

    // Perform web research if enabled
    let webResearchContext = '';
    if (enableWebResearch && topic) {
      const searchQuery = `${topic} ${targetAudience ? `for ${targetAudience}` : ''} tutorial guide best practices ${new Date().getFullYear()}`;
      webResearchContext = await searchWeb(searchQuery);
    }

    // Format existing graph context for AI
    let existingContext = '';
    if (existingGraph && existingGraph.blocks && existingGraph.blocks.length > 0) {
      existingContext = '\n\nEXISTING CONTENT CONTEXT:\n';
      existingContext += `The journey already has ${existingGraph.blocks.length} blocks:\n\n`;

      existingGraph.blocks.forEach((block, index) => {
        const content = block.content as Record<string, unknown>;
        existingContext += `${index + 1}. [${block.type.toUpperCase()}] ${content.title || 'Untitled'}\n`;

        // Add relevant content details
        if (block.type === 'read' && content.markdown) {
          const preview = (content.markdown as string).substring(0, 200).replace(/\n/g, ' ');
          existingContext += `   Content: ${preview}${(content.markdown as string).length > 200 ? '...' : ''}\n`;
        } else if (block.type === 'quiz' && Array.isArray(content.questions)) {
          existingContext += `   ${content.questions.length} questions\n`;
        } else if (block.type === 'mission' && Array.isArray(content.steps)) {
          existingContext += `   ${content.steps.length} steps\n`;
        } else if (content.description) {
          existingContext += `   ${content.description}\n`;
        }
        existingContext += '\n';
      });

      existingContext += `\nIMPORTANT: Build upon this existing content. Do not duplicate topics. Generate complementary content that extends the learning journey. Reference and connect to existing blocks where appropriate.\n`;
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'outline':
        systemPrompt = `You are an expert instructional designer. Generate a course outline as a JSON object.

The response MUST be valid JSON in this exact format:
{
  "startBlockId": "block_1",
  "blocks": [
    {
      "id": "block_1",
      "type": "read",
      "content": {
        "title": "...",
        "markdown": "# Title\\n\\nContent...",
        "estimatedReadTime": 3
      }
    },
    {
      "id": "block_2",
      "type": "video",
      "content": {
        "title": "...",
        "url": "",
        "description": "Video about..."
      }
    },
    {
      "id": "block_3",
      "type": "quiz",
      "content": {
        "title": "Knowledge Check",
        "questions": [
          {
            "id": "q1",
            "prompt": "Question text?",
            "choices": ["A", "B", "C", "D"],
            "correctIndex": 0,
            "explanation": "Explanation...",
            "tags": ["topic"]
          }
        ],
        "passingScore": 50
      }
    },
    {
      "id": "block_4",
      "type": "ai_help",
      "content": {
        "title": "Need Help?",
        "mode": "targeted_remediation"
      }
    },
    {
      "id": "block_5",
      "type": "mission",
      "content": {
        "title": "Hands-on Task",
        "description": "...",
        "steps": [
          { "id": "s1", "instruction": "Step 1..." },
          { "id": "s2", "instruction": "Step 2..." }
        ]
      }
    }
  ],
  "edges": [
    { "from": "block_1", "to": "block_2" },
    { "from": "block_2", "to": "block_3" },
    { "from": "block_3", "to": "block_5", "condition": { "all": [{ "fact": "quiz.scorePercent", "op": "gte", "value": 50 }] }, "priority": 10 },
    { "from": "block_3", "to": "block_4", "condition": { "all": [{ "fact": "quiz.scorePercent", "op": "lt", "value": 50 }] }, "priority": 10 },
    { "from": "block_4", "to": "block_3" }
  ]
}

Block types available: read, video, quiz, mission, form, ai_help, checkpoint, animation

IMPORTANT:
- Generate actual educational content, not placeholders
- Include rich markdown for read blocks with headers, lists, code examples where relevant
- Quiz questions should test understanding, not just recall
- Add branching: if quiz score < 50%, route to ai_help block, then back to quiz
- Return ONLY valid JSON, no markdown code blocks or explanations`;

        userPrompt = `Create a course outline about: ${topic}

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}
Estimated duration: ${duration || 20} minutes
Number of blocks: ${blockCount || 6}
Include video blocks: ${includeVideo ? 'yes' : 'no'}
Include quiz: ${includeQuiz !== false ? 'yes' : 'no'}

Generate comprehensive educational content with proper flow and branching logic.${existingContext}${webResearchContext}`;
        break;

      case 'content':
        systemPrompt = `You are an expert educational content writer. Generate engaging, clear educational content in Markdown format.

Guidelines:
- Use clear headings and structure
- Include practical examples and analogies
- Break complex concepts into digestible parts
- Use bullet points and numbered lists
- Include code examples where relevant (with proper markdown formatting)
- Add blockquotes for key takeaways
- Keep paragraphs short and readable`;

        userPrompt = `Write educational content about: ${topic}

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}

${existingContent ? `Build upon this existing content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        break;

      case 'quiz':
        systemPrompt = `You are an expert assessment designer. Generate quiz questions as a JSON array.

Response format:
[
  {
    "id": "q1",
    "prompt": "Question text?",
    "choices": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this answer is correct...",
    "tags": ["relevant", "topics"]
  }
]

Guidelines:
- Questions should test understanding, not just memorization
- Include plausible distractors
- Explanations should be educational
- Tags help identify weak areas
- Return ONLY valid JSON array`;

        userPrompt = `Generate 4-6 quiz questions about: ${topic}

${existingContent ? `Based on this content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        break;

      case 'video_script':
        systemPrompt = `You are a video script writer for educational content. Generate a script that's engaging and educational.

Format:
- Start with a hook
- Clear structure with timestamps
- Conversational but professional tone
- Include visual cues in [brackets]
- End with a summary and call to action`;

        userPrompt = `Write a video script about: ${topic}

Duration: ${duration || 5} minutes
Target audience: ${targetAudience || 'beginners'}${existingContext}${webResearchContext}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid generation type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

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
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    let content = data.choices[0]?.message?.content || '';

    if (type === 'outline' || type === 'quiz') {
      try {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(content);
        return new Response(
          JSON.stringify({ result: parsed }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error('JSON parse error:', e);
        return new Response(
          JSON.stringify({ result: content, parseError: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ result: content }),
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