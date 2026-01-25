/*
  # Add AI Context Settings

  1. New Settings
    - `ai_default_system_prompt` - Default AI persona/instructions for all AI interactions
    - `ai_default_language` - Default response language (e.g., 'ar', 'en')
    - `ai_default_subject_domain` - Default subject area for context

  2. Purpose
    - Allow administrators to configure global AI context settings
    - These settings serve as defaults that can be overridden at the block level
*/

-- Insert default AI context settings
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES 
  ('ai_default_system_prompt', 'You are a helpful, patient, and encouraging learning assistant. Your goal is to help students understand concepts clearly and build their confidence. Always be supportive while maintaining educational rigor.', 'Default system prompt/persona for AI interactions', 'ai'),
  ('ai_default_language', 'ar', 'Default language for AI responses (ar=Arabic, en=English)', 'ai'),
  ('ai_default_subject_domain', '', 'Default subject domain/topic area for AI context', 'ai')
ON CONFLICT (setting_key) DO NOTHING;
