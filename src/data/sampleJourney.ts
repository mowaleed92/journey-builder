import type { GraphDefinition } from '../types/database';

export const sampleJourneyGraph: GraphDefinition = {
  startBlockId: 'welcome',
  blocks: [
    {
      id: 'welcome',
      type: 'read',
      content: {
        title: 'Welcome to GenAI Fundamentals',
        markdown: `# Introduction to Generative AI

Welcome to this foundational module on **Generative AI**. In this journey, you'll learn the core concepts that power modern AI systems like ChatGPT, Claude, and other large language models.

## What You'll Learn

- What generative AI is and how it differs from traditional AI
- How language models process and generate text
- Key concepts: tokens, prompts, and context windows
- Practical applications and limitations

## Prerequisites

No prior AI experience is required! We'll start from the basics and build up your understanding step by step.

## Time Commitment

This module takes approximately **15-20 minutes** to complete. You'll encounter:

- Reading sections like this one
- A short quiz to check your understanding
- An optional hands-on mission

> **Tip:** Take your time with each section. Understanding these fundamentals will help you use AI tools more effectively.

Let's begin your AI learning journey!`,
        estimatedReadTime: 3,
      },
    },
    {
      id: 'what-is-genai',
      type: 'read',
      content: {
        title: 'What is Generative AI?',
        markdown: `# Understanding Generative AI

**Generative AI** refers to artificial intelligence systems that can create new content - text, images, music, code, and more. Unlike traditional AI that classifies or analyzes existing data, generative AI produces entirely new outputs.

## Traditional AI vs Generative AI

**Traditional AI** (Discriminative):
- Classifies emails as spam or not spam
- Detects objects in photos
- Predicts stock prices

**Generative AI**:
- Writes entire emails from scratch
- Creates new images from descriptions
- Writes code based on requirements

## How Does It Work?

At its core, generative AI learns **patterns** from massive amounts of data. When you give it a prompt (input), it generates output by predicting what should come next based on those learned patterns.

\`\`\`
Input: "Write a haiku about coding"

Output: "Fingers on keyboard,
Logic flows like mountain streams,
Bugs become features."
\`\`\`

## Key Components

1. **Training Data**: Massive datasets of text, images, or other content
2. **Neural Network**: The "brain" that learns patterns
3. **Parameters**: Billions of adjustable weights that store knowledge
4. **Inference**: The process of generating new content

## Why Now?

Three factors enabled the AI revolution:

- **Data**: The internet provides unlimited training material
- **Compute**: GPUs can process data in parallel
- **Research**: Transformer architecture breakthrough (2017)

> **Remember**: Generative AI doesn't "understand" like humans do - it's an extremely sophisticated pattern matcher.`,
        estimatedReadTime: 4,
      },
    },
    {
      id: 'tokens-explained',
      type: 'read',
      content: {
        title: 'Understanding Tokens',
        markdown: `# Tokens: The Building Blocks of AI

Before an AI can process your text, it must break it into smaller pieces called **tokens**. Understanding tokens is crucial for using AI effectively.

## What is a Token?

A token is a chunk of text that the AI treats as a single unit. It's not quite a word, not quite a character - it's somewhere in between.

**Examples:**

| Text | Tokens | Count |
|------|--------|-------|
| "Hello" | "Hello" | 1 |
| "Hello world" | "Hello", " world" | 2 |
| "ChatGPT" | "Chat", "G", "PT" | 3 |
| "absolutely" | "absol", "utely" | 2 |

## Why Tokens Matter

### 1. Cost
Most AI services charge per token. More tokens = higher cost.

### 2. Context Limits
Every AI has a maximum **context window** - the total tokens it can handle in one conversation.

- GPT-4: ~128,000 tokens
- Claude: ~200,000 tokens
- Older models: ~4,000 tokens

### 3. Output Quality
Understanding tokenization helps you write better prompts.

## Rules of Thumb

- **1 token ≈ 4 characters** in English
- **1 token ≈ 0.75 words**
- **100 tokens ≈ 75 words**

\`\`\`python
# A rough estimation
text = "The quick brown fox jumps over the lazy dog"
estimated_tokens = len(text) / 4  # ≈ 11 tokens
\`\`\`

## Common Gotchas

- Numbers often become multiple tokens: "2024" → "20", "24"
- Code can be token-heavy due to symbols
- Non-English languages often use more tokens

> **Pro Tip**: When working with AI, keep prompts concise. Every extra word costs tokens and can reduce output quality.`,
        estimatedReadTime: 4,
      },
    },
    {
      id: 'quiz-basics',
      type: 'quiz',
      content: {
        title: 'Knowledge Check',
        description: 'Test your understanding of GenAI fundamentals',
        passingScore: 50,
        allowRetry: true,
        shuffleQuestions: false,
        questions: [
          {
            id: 'q1',
            prompt: 'What makes Generative AI different from traditional AI?',
            choices: [
              'It only works with images',
              'It creates new content rather than just classifying existing data',
              'It requires less computing power',
              'It can only process text',
            ],
            correctIndex: 1,
            explanation:
              'Generative AI is distinguished by its ability to create new content (text, images, code) rather than just analyzing or classifying existing data.',
            tags: ['generative-ai', 'fundamentals'],
          },
          {
            id: 'q2',
            prompt: 'Approximately how many characters does one token represent in English?',
            choices: ['1 character', '4 characters', '10 characters', '1 word'],
            correctIndex: 1,
            explanation:
              'A rough rule of thumb is that 1 token ≈ 4 characters in English, or about 0.75 words.',
            tags: ['tokens'],
          },
          {
            id: 'q3',
            prompt: 'What is a "context window" in AI?',
            choices: [
              'The visual interface of the AI',
              'The maximum number of tokens an AI can process in one conversation',
              'The time limit for AI responses',
              'The programming language used by the AI',
            ],
            correctIndex: 1,
            explanation:
              'The context window is the maximum number of tokens (input + output) that an AI can handle in a single conversation or request.',
            tags: ['tokens', 'context'],
          },
          {
            id: 'q4',
            prompt: 'Which breakthrough enabled the modern AI revolution?',
            choices: [
              'The invention of the internet',
              'The Transformer architecture (2017)',
              'The first computer',
              'Social media platforms',
            ],
            correctIndex: 1,
            explanation:
              'While data and compute were important, the Transformer architecture introduced in 2017 was the key research breakthrough that enabled modern large language models.',
            tags: ['fundamentals', 'history'],
          },
        ],
      },
    },
    {
      id: 'ai-help-remediation',
      type: 'ai_help',
      content: {
        title: 'Let\'s Review Together',
        mode: 'targeted_remediation',
        maxTurns: 5,
      },
    },
    {
      id: 'mission-chatgpt',
      type: 'mission',
      content: {
        title: 'Try ChatGPT Yourself',
        description:
          'Now that you understand the basics, let\'s put your knowledge into practice!',
        steps: [
          {
            id: 'step1',
            instruction: 'Go to chat.openai.com and create a free account (or log in)',
            verificationMethod: 'self_report',
          },
          {
            id: 'step2',
            instruction: 'Ask ChatGPT to explain what tokens are in simple terms',
            verificationMethod: 'self_report',
          },
          {
            id: 'step3',
            instruction: 'Ask it to estimate how many tokens are in a sentence you provide',
            verificationMethod: 'self_report',
          },
        ],
        externalUrl: 'https://chat.openai.com',
        completionMessage:
          'Excellent! You\'ve now had hands-on experience with a generative AI system. Notice how it responded to your prompts - that\'s the pattern-matching in action!',
      },
    },
    {
      id: 'completion',
      type: 'read',
      content: {
        title: 'Module Complete!',
        markdown: `# Congratulations!

You've completed the **GenAI Fundamentals** module. Let's recap what you learned:

## Key Takeaways

1. **Generative AI** creates new content by learning patterns from data
2. **Tokens** are the basic units AI uses to process text (~4 characters each)
3. **Context windows** limit how much an AI can "remember" in a conversation
4. Modern AI was enabled by data, compute, and the Transformer architecture

## What's Next?

In the next module, you'll learn about:
- **Prompt Engineering**: How to write effective prompts
- **AI Limitations**: Understanding what AI can and can't do
- **Practical Applications**: Real-world use cases

## Keep Practicing

The best way to learn AI is by using it. Continue experimenting with:
- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Other AI tools you encounter

> **Remember**: AI is a tool. The more you understand how it works, the more effectively you can use it.

---

Thank you for completing this module! Your journey into AI has just begun.`,
        estimatedReadTime: 2,
      },
    },
  ],
  edges: [
    { from: 'welcome', to: 'what-is-genai' },
    { from: 'what-is-genai', to: 'tokens-explained' },
    { from: 'tokens-explained', to: 'quiz-basics' },
    {
      from: 'quiz-basics',
      to: 'mission-chatgpt',
      condition: {
        all: [{ fact: 'quiz.scorePercent', op: 'gte', value: 50 }],
      },
      priority: 10,
    },
    {
      from: 'quiz-basics',
      to: 'ai-help-remediation',
      condition: {
        all: [{ fact: 'quiz.scorePercent', op: 'lt', value: 50 }],
      },
      priority: 10,
    },
    { from: 'ai-help-remediation', to: 'quiz-basics' },
    { from: 'mission-chatgpt', to: 'completion' },
  ],
};
