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

interface TrackModuleContext {
  moduleId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  isCurrent: boolean;
  graph: GraphDefinition | null;
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
  includeMission?: boolean;
  includeImage?: boolean;
  includeCode?: boolean;
  includeExercise?: boolean;
  includeResource?: boolean;
  includeForm?: boolean;
  includeAIHelp?: boolean;
  includeCheckpoint?: boolean;
  includeAnimation?: boolean;
  existingContent?: string;
  existingGraph?: GraphDefinition;
  enableWebResearch?: boolean;
  model?: string;
  trackModulesContext?: TrackModuleContext[];
  generateImages?: boolean;
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
    const { 
      type, topic, targetAudience, difficulty, duration, blockCount, 
      includeVideo, includeQuiz, includeMission, includeImage, includeCode, 
      includeExercise, includeResource, includeForm, includeAIHelp, 
      includeCheckpoint, includeAnimation,
      existingContent, existingGraph, enableWebResearch = true, model = 'gpt-4o',
      trackModulesContext, generateImages = false
    } = body;

    // Perform web research if enabled
    let webResearchContext = '';
    if (enableWebResearch && topic) {
      const searchQuery = `${topic} ${targetAudience ? `for ${targetAudience}` : ''} tutorial guide best practices ${new Date().getFullYear()}`;
      webResearchContext = await searchWeb(searchQuery);
    }

    // Format FULL track context for AI (with complete content from all modules)
    let trackContext = '';
    if (trackModulesContext && trackModulesContext.length > 1) {
      const totalModules = trackModulesContext.length;
      const currentModule = trackModulesContext.find(m => m.isCurrent);
      const previousModules = trackModulesContext.filter(m => !m.isCurrent && m.orderIndex < (currentModule?.orderIndex ?? 999));

      if (previousModules.length > 0) {
        trackContext = '\n\n═══════════════════════════════════════════════════════════════\n';
        trackContext += `TRACK LEARNING PROGRESSION (FULL CONTENT):\n`;
        trackContext += `This is Module ${(currentModule?.orderIndex ?? 0) + 1} of ${totalModules} in the track.\n`;
        trackContext += `Here is the COMPLETE content from previous modules:\n`;
        trackContext += '═══════════════════════════════════════════════════════════════\n\n';

        previousModules.forEach((module) => {
          trackContext += `\n═══════════════════════════════════════════════════════════════\n`;
          trackContext += `MODULE ${module.orderIndex + 1} of ${totalModules}: "${module.title}"\n`;
          if (module.description) {
            trackContext += `Description: ${module.description}\n`;
          }
          trackContext += `═══════════════════════════════════════════════════════════════\n\n`;

          if (module.graph && module.graph.blocks && module.graph.blocks.length > 0) {
            module.graph.blocks.forEach((block, index) => {
              const content = block.content as Record<string, unknown>;
              trackContext += `Block ${index + 1} [${block.type.toUpperCase()}] "${content.title || 'Untitled'}"\n`;
              trackContext += '---\n';

              // Include FULL content (not previews)
              if (block.type === 'read' && content.markdown) {
                trackContext += `${content.markdown}\n`;
              } else if (block.type === 'quiz' && Array.isArray(content.questions)) {
                trackContext += `Quiz with ${content.questions.length} questions:\n`;
                content.questions.forEach((q: any, qIdx: number) => {
                  trackContext += `${qIdx + 1}. ${q.prompt}\n`;
                  trackContext += `   Choices: ${q.choices?.join(', ')}\n`;
                  trackContext += `   Correct Answer: ${q.choices?.[q.correctIndex]}\n`;
                  if (q.explanation) {
                    trackContext += `   Explanation: ${q.explanation}\n`;
                  }
                });
              } else if (block.type === 'code' && content.code) {
                trackContext += `Language: ${content.language}\n`;
                trackContext += '```\n';
                trackContext += `${content.code}\n`;
                trackContext += '```\n';
                if (content.description) {
                  trackContext += `Description: ${content.description}\n`;
                }
              } else if (block.type === 'mission' && Array.isArray(content.steps)) {
                trackContext += `Mission with ${content.steps.length} steps:\n`;
                content.steps.forEach((step: any, sIdx: number) => {
                  trackContext += `${sIdx + 1}. ${step.instruction}\n`;
                });
              } else if (block.type === 'exercise' && content.problem) {
                trackContext += `Problem: ${content.problem}\n`;
                if (Array.isArray(content.hints) && content.hints.length > 0) {
                  trackContext += `Hints: ${content.hints.join('; ')}\n`;
                }
                if (content.solution) {
                  trackContext += `Solution: ${content.solution}\n`;
                }
              } else if (content.description) {
                trackContext += `${content.description}\n`;
              }
              trackContext += '---\n\n';
            });
          } else {
            trackContext += '(No content yet)\n\n';
          }
        });

        trackContext += '\n═══════════════════════════════════════════════════════════════\n';
        trackContext += `MODULE ${(currentModule?.orderIndex ?? 0) + 1} of ${totalModules}: "${currentModule?.title || 'Current Module'}" (CURRENT - YOU ARE GENERATING THIS)\n`;
        trackContext += '═══════════════════════════════════════════════════════════════\n\n';
        trackContext += 'CRITICAL INSTRUCTIONS:\n';
        trackContext += '- You have access to the COMPLETE content above - use it to ensure continuity\n';
        trackContext += '- Build upon concepts already taught (don\'t re-explain basics)\n';
        trackContext += '- Reference specific content from previous modules where appropriate\n';
        trackContext += '- Do NOT repeat information already covered\n';
        trackContext += '- Progress to more advanced topics that logically follow\n\n';
      }
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

    // Determine if this is a track continuation
    const isTrackContinuation = trackModulesContext && trackModulesContext.length > 1;
    const currentModuleInfo = trackModulesContext?.find(m => m.isCurrent);
    const previousModulesWithContent = trackModulesContext?.filter(
      m => !m.isCurrent && m.orderIndex < (currentModuleInfo?.orderIndex ?? 999) && m.graph?.blocks?.length > 0
    ) || [];
    const hasTrackContext = previousModulesWithContent.length > 0;

    switch (type) {
      case 'outline':
        systemPrompt = `You are an expert instructional designer. Generate a course outline as a JSON object.

${hasTrackContext ? `
CRITICAL - TRACK CONTINUATION MODE:
You are generating content for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1} of ${trackModulesContext?.length} in a learning track.
This module titled "${currentModuleInfo?.title || 'Current Module'}" MUST continue from the previous module(s).

MANDATORY REQUIREMENTS:
1. You MUST build upon concepts already taught in previous modules - DO NOT start from scratch
2. You MUST NOT repeat or re-explain content already covered
3. You MUST reference and connect to previous content where appropriate
4. You MUST progress to more advanced topics that logically follow
5. The user's topic description tells you WHAT to cover next, but you MUST ensure it flows naturally from previous content
6. If the user's topic seems disconnected, find a way to bridge it with previous content

The FULL content from previous modules will be provided. Use it extensively.
` : ''}
The response MUST be valid JSON in this exact format:
{
  "startBlockId": "block_1",
  "blocks": [
    {
      "id": "block_1",
      "type": "read",
      "content": {
        "title": "Introduction",
        "markdown": "# Title\\n\\nContent with **bold**, *italic*, lists, and code examples...",
        "estimatedReadTime": 3
      }
    },
    {
      "id": "block_2",
      "type": "video",
      "content": {
        "title": "Video Title",
        "url": "",
        "description": "Video about..."
      }
    },
    {
      "id": "block_3",
      "type": "image",
      "content": {
        "title": "Diagram Title",
        "url": "",
        "caption": "Description of the image/diagram",
        "alt": "Alt text for accessibility"
      }
    },
    {
      "id": "block_4",
      "type": "code",
      "content": {
        "title": "Code Example",
        "code": "// Your code here\\nfunction example() {\\n  return 'Hello World';\\n}",
        "language": "javascript",
        "showLineNumbers": true,
        "highlightLines": [2],
        "description": "Explanation of what this code does"
      }
    },
    {
      "id": "block_5",
      "type": "quiz",
      "content": {
        "title": "Knowledge Check",
        "questions": [
          {
            "id": "q1",
            "prompt": "Question text?",
            "choices": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0,
            "explanation": "Why this answer is correct...",
            "tags": ["topic"]
          }
        ],
        "passingScore": 50
      }
    },
    {
      "id": "block_6",
      "type": "ai_help",
      "content": {
        "title": "Need Help?",
        "mode": "targeted_remediation"
      }
    },
    {
      "id": "block_7",
      "type": "mission",
      "content": {
        "title": "Hands-on Task",
        "description": "Complete this practical task",
        "steps": [
          { "id": "s1", "instruction": "Step 1: Do this..." },
          { "id": "s2", "instruction": "Step 2: Then do this..." }
        ]
      }
    },
    {
      "id": "block_8",
      "type": "exercise",
      "content": {
        "title": "Practice Problem",
        "description": "Test your understanding",
        "problem": "Write a function that...",
        "hints": ["Hint 1: Consider...", "Hint 2: Remember to..."],
        "solution": "function solution() { ... }",
        "solutionExplanation": "This solution works because..."
      }
    },
    {
      "id": "block_9",
      "type": "resource",
      "content": {
        "title": "Additional Resources",
        "description": "Explore these resources to learn more",
        "resources": [
          { "id": "r1", "title": "Official Documentation", "url": "https://example.com/docs", "type": "link", "description": "The official guide" },
          { "id": "r2", "title": "Video Tutorial", "url": "https://example.com/video", "type": "video", "description": "A helpful video" }
        ]
      }
    },
    {
      "id": "block_10",
      "type": "form",
      "content": {
        "title": "Feedback Form",
        "description": "Share your thoughts",
        "fields": [
          { "id": "f1", "type": "text", "label": "Your name", "required": true },
          { "id": "f2", "type": "textarea", "label": "Your feedback", "required": true },
          { "id": "f3", "type": "select", "label": "Rating", "options": ["Excellent", "Good", "Average", "Poor"], "required": true }
        ],
        "submitLabel": "Submit"
      }
    },
    {
      "id": "block_11",
      "type": "checkpoint",
      "content": {
        "title": "Progress Check",
        "description": "You've completed this section!"
      }
    },
    {
      "id": "block_12",
      "type": "animation",
      "content": {
        "title": "Interactive Demo",
        "animationType": "lottie",
        "url": "",
        "autoplay": true,
        "loop": false
      }
    }
  ],
  "edges": [
    { "from": "block_1", "to": "block_2" },
    { "from": "block_2", "to": "block_5" },
    { "from": "block_5", "to": "block_7", "condition": { "all": [{ "fact": "quiz.scorePercent", "op": "gte", "value": 50 }] }, "priority": 10 },
    { "from": "block_5", "to": "block_6", "condition": { "all": [{ "fact": "quiz.scorePercent", "op": "lt", "value": 50 }] }, "priority": 10 },
    { "from": "block_6", "to": "block_5" }
  ]
}

Block types available: read, video, image, code, quiz, mission, exercise, resource, form, ai_help, checkpoint, animation

BLOCK TYPE GUIDELINES:
- read: Rich markdown content with headers, lists, code examples. Always include.
- video: Placeholder for video content. URL will be empty (to be filled later).
- image: Placeholder for diagrams/images. URL will be empty (to be filled later).
- code: Syntax-highlighted code snippets. Include language, actual working code examples.
- quiz: Multiple choice questions with explanations. Include passingScore (usually 50).
- mission: Hands-on tasks with step-by-step instructions.
- exercise: Practice problems with hints and solutions.
- resource: Curated links/resources. Use placeholder URLs if specific ones unknown.
- form: Data collection forms for feedback, surveys. Define field types and labels.
- ai_help: AI tutoring block. Mode options: targeted_remediation, open_chat, guided_explanation.
- checkpoint: Progress validation points. Simple title and description.
- animation: Interactive animations. URL will be empty (to be filled later).

IMPORTANT:
- Generate actual educational content, not placeholders for read/code/quiz blocks
- Include rich markdown for read blocks with headers, lists, code examples where relevant
- Quiz questions should test understanding, not just recall
- Add branching: if quiz score < 50%, route to ai_help block, then back to quiz
- Only include block types that are requested
- Return ONLY valid JSON, no markdown code blocks or explanations
${hasTrackContext ? `- CRITICAL: This is part of a learning track. Content MUST continue from previous modules, not start fresh. Reference previous content explicitly.` : ''}`;

        // Build user prompt with track context FIRST if this is a continuation
        if (hasTrackContext) {
          userPrompt = `${trackContext}

NOW GENERATE MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1}: "${currentModuleInfo?.title || topic}"

The user wants this module to cover: ${topic}

REMEMBER: This MUST continue from the previous module(s) shown above. Do NOT create standalone content.
Start where the previous module left off and build upon those concepts.

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}
Estimated duration: ${duration || 20} minutes
Number of blocks: ${blockCount || 6}

BLOCK TYPES TO INCLUDE:
- Video blocks: ${includeVideo ? 'yes' : 'no'}
- Image blocks: ${includeImage ? 'yes' : 'no'}
- Code snippets: ${includeCode ? 'yes' : 'no'}
- Additional resources: ${includeResource ? 'yes' : 'no'}
- Quiz & assessment: ${includeQuiz !== false ? 'yes' : 'no'}
- Hands-on mission: ${includeMission !== false ? 'yes' : 'no'}
- Practice exercises: ${includeExercise ? 'yes' : 'no'}
- Data collection forms: ${includeForm ? 'yes' : 'no'}
- AI help/remediation: ${includeAIHelp ? 'yes (add after quiz for failed attempts)' : 'no'}
- Progress checkpoints: ${includeCheckpoint ? 'yes' : 'no'}
- Animations: ${includeAnimation ? 'yes' : 'no'}

Generate content that naturally continues the learning progression. Reference concepts from previous modules. Only include the block types marked "yes" above.${existingContext}${webResearchContext}`;
        } else {
          userPrompt = `Create a course outline about: ${topic}

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}
Estimated duration: ${duration || 20} minutes
Number of blocks: ${blockCount || 6}

BLOCK TYPES TO INCLUDE:
- Video blocks: ${includeVideo ? 'yes' : 'no'}
- Image blocks: ${includeImage ? 'yes' : 'no'}
- Code snippets: ${includeCode ? 'yes' : 'no'}
- Additional resources: ${includeResource ? 'yes' : 'no'}
- Quiz & assessment: ${includeQuiz !== false ? 'yes' : 'no'}
- Hands-on mission: ${includeMission !== false ? 'yes' : 'no'}
- Practice exercises: ${includeExercise ? 'yes' : 'no'}
- Data collection forms: ${includeForm ? 'yes' : 'no'}
- AI help/remediation: ${includeAIHelp ? 'yes (add after quiz for failed attempts)' : 'no'}
- Progress checkpoints: ${includeCheckpoint ? 'yes' : 'no'}
- Animations: ${includeAnimation ? 'yes' : 'no'}

Generate comprehensive educational content with proper flow and branching logic. Only include the block types marked "yes" above.${existingContext}${webResearchContext}`;
        }
        break;

      case 'content':
        systemPrompt = `You are an expert educational content writer. Generate engaging, clear educational content in Markdown format.
${hasTrackContext ? `
IMPORTANT: This content is for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1} in a learning track.
You MUST continue from previous modules - do not start from scratch or repeat covered material.
` : ''}
Guidelines:
- Use clear headings and structure
- Include practical examples and analogies
- Break complex concepts into digestible parts
- Use bullet points and numbered lists
- Include code examples where relevant (with proper markdown formatting)
- Add blockquotes for key takeaways
- Keep paragraphs short and readable`;

        if (hasTrackContext) {
          userPrompt = `${trackContext}

NOW WRITE CONTENT FOR MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1}: "${currentModuleInfo?.title || topic}"
Topic to cover: ${topic}

This content MUST continue from the previous module(s). Reference concepts already taught.

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}

${existingContent ? `Build upon this existing content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        } else {
          userPrompt = `Write educational content about: ${topic}

Target audience: ${targetAudience || 'beginners'}
Difficulty: ${difficulty || 'beginner'}

${existingContent ? `Build upon this existing content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        }
        break;

      case 'quiz':
        systemPrompt = `You are an expert assessment designer. Generate quiz questions as a JSON array.
${hasTrackContext ? `
IMPORTANT: These questions are for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1} in a learning track.
Questions should test understanding of THIS module's content while assuming knowledge from previous modules.
` : ''}
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

        if (hasTrackContext) {
          userPrompt = `${trackContext}

Generate 4-6 quiz questions for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1}: "${currentModuleInfo?.title || topic}"
Topic: ${topic}

Questions should test this module's content while building on knowledge from previous modules.

${existingContent ? `Based on this content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        } else {
          userPrompt = `Generate 4-6 quiz questions about: ${topic}

${existingContent ? `Based on this content:\n${existingContent}` : ''}${existingContext}${webResearchContext}`;
        }
        break;

      case 'video_script':
        systemPrompt = `You are a video script writer for educational content. Generate a script that's engaging and educational.
${hasTrackContext ? `
IMPORTANT: This script is for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1} in a learning track.
Reference previous modules and continue the learning journey - don't start from scratch.
` : ''}
Format:
- Start with a hook
- Clear structure with timestamps
- Conversational but professional tone
- Include visual cues in [brackets]
- End with a summary and call to action`;

        if (hasTrackContext) {
          userPrompt = `${trackContext}

Write a video script for MODULE ${(currentModuleInfo?.orderIndex ?? 0) + 1}: "${currentModuleInfo?.title || topic}"
Topic: ${topic}

This script should continue from previous modules and reference concepts already covered.

Duration: ${duration || 5} minutes
Target audience: ${targetAudience || 'beginners'}${existingContext}${webResearchContext}`;
        } else {
          userPrompt = `Write a video script about: ${topic}

Duration: ${duration || 5} minutes
Target audience: ${targetAudience || 'beginners'}${existingContext}${webResearchContext}`;
        }
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
        ...getTokenParam(model, 4000),
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
        
        // Auto-generate images for image blocks if requested
        if (type === 'outline' && generateImages && parsed.blocks) {
          console.log('Generating images for image blocks...');
          for (const block of parsed.blocks) {
            if (block.type === 'image' && block.content && !block.content.url) {
              try {
                const imagePrompt = block.content.caption 
                  ? `${block.content.caption}`
                  : `Educational illustration for: ${block.content.title}`;
                
                console.log(`Generating image for: ${block.content.title}`);
                
                // Call the image-generator edge function
                const imageResponse = await fetch(
                  `${Deno.env.get('SUPABASE_URL')}/functions/v1/image-generator`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                    },
                    body: JSON.stringify({
                      prompt: imagePrompt,
                      model: 'gpt-image-1.5',
                      contextTitle: block.content.title,
                    }),
                  }
                );

                if (imageResponse.ok) {
                  const imageData = await imageResponse.json();
                  block.content.url = imageData.url;
                  console.log(`Image generated successfully for: ${block.content.title}`);
                } else {
                  console.error(`Failed to generate image for: ${block.content.title}`);
                  // Leave URL empty if generation fails
                }
              } catch (imgError) {
                console.error('Error generating image:', imgError);
                // Continue with empty URL if image generation fails
              }
            }
          }
        }
        
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