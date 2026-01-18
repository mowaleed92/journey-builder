import { useState } from 'react';
import { FileText, ChevronRight, AlertCircle } from 'lucide-react';
import type { FormBlockContent, FormField } from '../../types/database';

interface FormBlockProps {
  content: FormBlockContent;
  onComplete: (data: Record<string, unknown>) => void;
  previousOutput?: Record<string, unknown>;
}

export function FormBlock({ content, onComplete, previousOutput }: FormBlockProps) {
  const [values, setValues] = useState<Record<string, unknown>>(previousOutput || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'This field is required';
    }

    if (field.validation && typeof value === 'string') {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        return `Must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        return `Must be no more than ${field.validation.maxLength} characters`;
      }
      if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
        return 'Invalid format';
      }
    }

    return null;
  };

  const handleChange = (fieldId: string, value: unknown) => {
    setValues({ ...values, [fieldId]: value });

    const field = content.fields.find((f) => f.id === fieldId);
    if (field && touched.has(fieldId)) {
      const error = validateField(field, value);
      setErrors({ ...errors, [fieldId]: error || '' });
    }
  };

  const handleBlur = (fieldId: string) => {
    setTouched(new Set([...touched, fieldId]));

    const field = content.fields.find((f) => f.id === fieldId);
    if (field) {
      const error = validateField(field, values[fieldId]);
      setErrors({ ...errors, [fieldId]: error || '' });
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    content.fields.forEach((field) => {
      const error = validateField(field, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    setTouched(new Set(content.fields.map((f) => f.id)));

    if (!hasErrors) {
      onComplete(values);
    }
  };

  const renderField = (field: FormField) => {
    const error = errors[field.id];
    const hasError = error && touched.has(field.id);

    const baseInputClasses = `w-full px-4 py-3 border rounded-lg text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      hasError ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white'
    }`;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={(values[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field.id)}
            placeholder={field.placeholder}
            className={baseInputClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={(values[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field.id)}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseInputClasses} resize-none`}
          />
        );

      case 'select':
        return (
          <select
            value={(values[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onBlur={() => handleBlur(field.id)}
            className={baseInputClasses}
          >
            <option value="">{field.placeholder || 'Select an option...'}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => {
              const selectedOptions = (values[field.id] as string[]) || [];
              const isChecked = selectedOptions.includes(option);

              return (
                <label
                  key={option}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const newOptions = isChecked
                        ? selectedOptions.filter((o) => o !== option)
                        : [...selectedOptions, option];
                      handleChange(field.id, newOptions);
                    }}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-700">{option}</span>
                </label>
              );
            })}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <input
                  type="radio"
                  name={field.id}
                  checked={values[field.id] === option}
                  onChange={() => handleChange(field.id, option)}
                  className="w-5 h-5 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{content.title}</h2>
            {content.description && (
              <p className="text-sm text-slate-500">{content.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {content.fields.map((field) => {
            const error = errors[field.id];
            const hasError = error && touched.has(field.id);

            return (
              <div key={field.id}>
                <label className="block mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </label>

                {renderField(field)}

                {hasError && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {content.submitLabel || 'Submit'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
