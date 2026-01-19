-- Add AI Image Model setting to system_settings
INSERT INTO system_settings (setting_key, setting_value, description, category)
VALUES ('ai_image_model', 'gpt-image-1.5', 'AI model used for generating educational images and diagrams', 'ai')
ON CONFLICT (setting_key) DO NOTHING;
