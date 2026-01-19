import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AISettings {
  enabled: boolean;
  contentModel: string;
  helpModel: string;
  isLoading: boolean;
}

/**
 * Hook to check if AI features are enabled and get AI model settings.
 * Reads from the system_settings table.
 */
export function useAIEnabled(): AISettings {
  const [settings, setSettings] = useState<AISettings>({
    enabled: true, // Default to true while loading
    contentModel: 'gpt-4o',
    helpModel: 'gpt-4o-mini',
    isLoading: true,
  });

  useEffect(() => {
    loadAISettings();
  }, []);

  const loadAISettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ai_enabled', 'ai_content_model', 'ai_help_model']);

      if (error) {
        console.error('Error loading AI settings:', error);
        setSettings(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data) {
        let enabled = true;
        let contentModel = 'gpt-4o';
        let helpModel = 'gpt-4o-mini';

        data.forEach(setting => {
          switch (setting.setting_key) {
            case 'ai_enabled':
              enabled = setting.setting_value === 'true';
              break;
            case 'ai_content_model':
              contentModel = setting.setting_value;
              break;
            case 'ai_help_model':
              helpModel = setting.setting_value;
              break;
          }
        });

        setSettings({
          enabled,
          contentModel,
          helpModel,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      setSettings(prev => ({ ...prev, isLoading: false }));
    }
  };

  return settings;
}

/**
 * Component to display when AI features are disabled.
 */
export function AIDisabledMessage() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-xl border border-slate-700">
      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">AI Features Disabled</h3>
      <p className="text-slate-400 text-center max-w-md">
        AI content generation has been disabled by the administrator.
        Contact your administrator to enable AI features.
      </p>
    </div>
  );
}
