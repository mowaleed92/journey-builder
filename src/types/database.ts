export interface Database {
  public: {
    Tables: {
      tracks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          level: 'beginner' | 'intermediate' | 'advanced';
          tags: string[];
          published_version_id: string | null;
          cover_image_url: string | null;
          estimated_duration_minutes: number;
          direction: 'rtl' | 'ltr';
          primary_language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tracks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracks']['Insert']>;
      };
      modules: {
        Row: {
          id: string;
          track_id: string;
          title: string;
          description: string | null;
          order_index: number;
          estimated_duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['modules']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['modules']['Insert']>;
      };
      journey_versions: {
        Row: {
          id: string;
          module_id: string;
          version: number;
          status: 'draft' | 'published' | 'archived';
          graph_json: GraphDefinition;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journey_versions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['journey_versions']['Insert']>;
      };
      user_journey_runs: {
        Row: {
          id: string;
          user_id: string;
          journey_version_id: string;
          current_block_id: string | null;
          status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
          started_at: string | null;
          completed_at: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_journey_runs']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_journey_runs']['Insert']>;
      };
      user_block_states: {
        Row: {
          id: string;
          run_id: string;
          block_id: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'skipped';
          attempts_count: number;
          output_json: Record<string, unknown>;
          score: number | null;
          weak_topics: string[];
          time_spent_seconds: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_block_states']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_block_states']['Insert']>;
      };
    };
  };
}

export interface GraphDefinition {
  startBlockId: string;
  blocks: Block[];
  edges: Edge[];
}

export type BlockType = 'read' | 'video' | 'quiz' | 'form' | 'mission' | 'animation' | 'ai_help' | 'checkpoint';

export interface Block {
  id: string;
  type: BlockType;
  content: BlockContent;
  ui?: BlockUI;
}

export interface BlockUI {
  layout?: 'default' | 'fullscreen' | 'split';
  theme?: 'light' | 'dark';
}

export type BlockContent =
  | ReadBlockContent
  | VideoBlockContent
  | QuizBlockContent
  | FormBlockContent
  | MissionBlockContent
  | AnimationBlockContent
  | AIHelpBlockContent
  | CheckpointBlockContent;

export interface ReadBlockContent {
  title: string;
  markdown: string;
  estimatedReadTime?: number;
}

export interface VideoBlockContent {
  title: string;
  url: string;
  duration?: number;
  transcript?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
  tags: string[];
}

export interface QuizBlockContent {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  passingScore?: number;
  allowRetry?: boolean;
  shuffleQuestions?: boolean;
  shuffleChoices?: boolean;
}

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface FormBlockContent {
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
}

export interface MissionStep {
  id: string;
  instruction: string;
  verificationMethod?: 'self_report' | 'screenshot' | 'url_check';
}

export interface MissionBlockContent {
  title: string;
  description?: string;
  steps: MissionStep[];
  externalUrl?: string;
  completionMessage?: string;
}

export interface AnimationBlockContent {
  title: string;
  animationType: 'lottie' | 'video' | 'interactive';
  url: string;
  autoplay?: boolean;
  loop?: boolean;
}

export interface AIHelpBlockContent {
  title: string;
  mode: 'targeted_remediation' | 'open_chat' | 'guided_explanation';
  contextFromBlocks?: string[];
  maxTurns?: number;
}

export interface CheckpointBlockContent {
  title: string;
  description?: string;
  evaluationCriteria?: ConditionGroup;
}

export interface Edge {
  id?: string;
  from: string;
  to: string;
  condition?: ConditionGroup;
  priority?: number;
  label?: string;
}

export interface Condition {
  fact: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface ConditionGroup {
  all?: (Condition | ConditionGroup)[];
  any?: (Condition | ConditionGroup)[];
}

export interface Facts {
  'quiz.scorePercent'?: number;
  'quiz.weakTopics'?: string[];
  'quiz.correctCount'?: number;
  'quiz.totalCount'?: number;
  'block.attemptsCount'?: number;
  'block.timeSpentSeconds'?: number;
  'block.status'?: string;
  'user.locale'?: string;
  'user.prefersVideo'?: boolean;
  [key: string]: unknown;
}

export type Track = Database['public']['Tables']['tracks']['Row'];
export type Module = Database['public']['Tables']['modules']['Row'];
export type JourneyVersion = Database['public']['Tables']['journey_versions']['Row'];
export type UserJourneyRun = Database['public']['Tables']['user_journey_runs']['Row'];
export type UserBlockState = Database['public']['Tables']['user_block_states']['Row'];

export interface GlossaryTerm {
  id: string;
  term: string;
  term_normalized: string;
  track_id: string | null;
  module_id: string | null;
  arabic_explanation: string;
  context_snippet: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordedVideo {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  duration_seconds: number;
  recording_type: 'camera' | 'screen' | 'camera_screen';
  thumbnail_path: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
