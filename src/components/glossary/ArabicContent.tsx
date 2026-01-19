import { ReactNode, useMemo } from 'react';
import { GlossaryTerm } from './GlossaryTerm';

interface ArabicContentProps {
  children: string;
  trackId?: string;
  moduleId?: string;
  className?: string;
}

const ENGLISH_TERM_PATTERN = /\b([A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*){0,3})\b/g;

const COMMON_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'over', 'after', 'and', 'or', 'but',
  'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'also', 'now', 'here', 'there', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which', 'who', 'whom',
]);

const TECHNICAL_INDICATORS = [
  /^[A-Z]{2,}$/,
  /^[A-Z][a-z]+[A-Z]/,
  /\d/,
  /^(API|SDK|UI|UX|CSS|HTML|JS|JSON|XML|SQL|HTTP|REST|GraphQL|Git|npm|AI|ML|GPT|LLM|RAG|NLP|CNN|RNN|LSTM|GAN|VAE|RL|DL|IoT|AWS|GCP|Azure|Docker|K8s|Kubernetes|React|Vue|Angular|Node|Python|Java|Go|Rust|Swift|Kotlin|TypeScript|JavaScript|PHP|Ruby|Scala|Clojure|Haskell|Elixir|Erlang|C|CPP|CSharp|FSharp|VB|Perl|Lua|Dart|Flutter|Android|iOS|macOS|Windows|Linux|Unix|Ubuntu|Debian|Fedora|CentOS|RedHat|SUSE|Arch|Alpine|Mint|Elementary|Pop|Manjaro|Kali|Parrot|BlackArch|Tails|Qubes|Whonix)$/i,
];

function isTechnicalTerm(term: string): boolean {
  const lowerTerm = term.toLowerCase();

  if (COMMON_WORDS.has(lowerTerm)) {
    return false;
  }

  if (term.length < 2) {
    return false;
  }

  for (const pattern of TECHNICAL_INDICATORS) {
    if (pattern.test(term)) {
      return true;
    }
  }

  if (term.length >= 4 && /^[A-Z]/.test(term)) {
    return true;
  }

  return false;
}

function extractContext(text: string, termIndex: number, termLength: number): string {
  const contextRadius = 100;
  const start = Math.max(0, termIndex - contextRadius);
  const end = Math.min(text.length, termIndex + termLength + contextRadius);

  let context = text.slice(start, end);

  if (start > 0) {
    context = '...' + context;
  }
  if (end < text.length) {
    context = context + '...';
  }

  return context;
}

export function ArabicContent({ children, trackId, moduleId, className = '' }: ArabicContentProps) {
  const processedContent = useMemo(() => {
    const text = children;
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    const matches = [...text.matchAll(ENGLISH_TERM_PATTERN)];

    for (const match of matches) {
      const term = match[1];
      const termIndex = match.index!;

      if (!isTechnicalTerm(term)) {
        continue;
      }

      if (termIndex > lastIndex) {
        parts.push(text.slice(lastIndex, termIndex));
      }

      const context = extractContext(text, termIndex, term.length);

      parts.push(
        <GlossaryTerm
          key={`${term}-${termIndex}`}
          term={term}
          contextSnippet={context}
          trackId={trackId}
          moduleId={moduleId}
        />
      );

      lastIndex = termIndex + term.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  }, [children, trackId, moduleId]);

  return (
    <span className={`arabic-content ${className}`}>
      {processedContent}
    </span>
  );
}
