import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  question_type: 'single-select' | 'multi-select' | 'text' | 'textarea' | 'number' | 'date';
  options?: string[];
  is_required: boolean;
  display_order: number;
  conditional_logic?: {
    show_if_question_id: string;
    show_if_answer: string;
  };
}

interface DynamicIntakeFormProps {
  industryName: string;
  onResponsesChange: (responses: Record<string, any>) => void;
  initialResponses?: Record<string, any>;
}

export const DynamicIntakeForm = ({ 
  industryName, 
  onResponsesChange,
  initialResponses = {}
}: DynamicIntakeFormProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>(initialResponses);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, [industryName]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      // Get template ID for industry
      const { data: template, error: templateError } = await supabase
        .from('intake_form_templates')
        .select('id')
        .eq('industry_name', industryName)
        .eq('is_active', true)
        .maybeSingle();

      // Handle table not found error (404) gracefully
      if (templateError) {
        // Check if table doesn't exist (PGRST205) or 404 error
        if (templateError.code === 'PGRST205' || templateError.message?.includes('Could not find the table') || templateError.message?.includes('404')) {
          console.log('Intake form templates table not found - skipping intake form');
          setQuestions([]);
          setLoading(false);
          return;
        }
        // For other errors, log but don't throw
        console.warn('Error loading intake form template:', templateError);
        setQuestions([]);
        setLoading(false);
        return;
      }

      if (!template) {
        console.log(`No template found for industry: ${industryName}`);
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Get questions for template
      const { data: questionsData, error: questionsError } = await supabase
        .from('intake_form_questions')
        .select('*')
        .eq('template_id', template.id)
        .order('display_order');

      if (questionsError) {
        // Handle table not found error gracefully
        // These errors are expected if the table hasn't been created yet
        if (questionsError.code === 'PGRST205' || 
            questionsError.code === '42P01' || 
            questionsError.message?.includes('Could not find the table') || 
            questionsError.message?.includes('does not exist') ||
            questionsError.message?.includes('404')) {
          // Silently skip - table doesn't exist, which is OK
          setQuestions([]);
          setLoading(false);
          return;
        }
        console.warn('Error loading intake form questions:', questionsError);
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Transform database data to match Question interface
      const transformedQuestions = (questionsData || []).map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as Question['question_type'],
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : undefined,
        is_required: q.is_required,
        display_order: q.display_order,
        conditional_logic: q.conditional_logic ? (typeof q.conditional_logic === 'string' ? JSON.parse(q.conditional_logic) : q.conditional_logic) : undefined
      }));

      setQuestions(transformedQuestions);
    } catch (error: any) {
      // Handle table not found errors gracefully
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table') || error?.message?.includes('404')) {
        console.log('Intake form tables not found - skipping intake form');
        setQuestions([]);
      } else {
        console.error('Error loading intake form:', error);
        // Don't show error toast for missing tables - it's OK if they don't exist
        if (!error?.message?.includes('404') && !error?.message?.includes('Could not find the table')) {
          toast.error('Failed to load intake form');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);
    onResponsesChange(newResponses);
  };

  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditional_logic) return true;
    
    const { show_if_question_id, show_if_answer } = question.conditional_logic;
    return responses[show_if_question_id] === show_if_answer;
  };

  const renderQuestion = (question: Question) => {
    if (!shouldShowQuestion(question)) return null;

    const commonProps = {
      required: question.is_required,
      className: "mt-2"
    };

    switch (question.question_type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            type="text"
            value={responses[question.id] || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Enter your answer"
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={responses[question.id] || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Enter your answer"
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={responses[question.id] || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Enter a number"
          />
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={responses[question.id] || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
          />
        );

      case 'single-select':
        return (
          <RadioGroup
            value={responses[question.id] || ''}
            onValueChange={(value) => handleResponseChange(question.id, value)}
            className="mt-2 space-y-2"
          >
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                <Label htmlFor={`${question.id}-${idx}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multi-select':
        const selectedValues = responses[question.id] || [];
        return (
          <div className="mt-2 space-y-2">
            {question.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${idx}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v: string) => v !== option);
                    handleResponseChange(question.id, newValues);
                  }}
                />
                <Label htmlFor={`${question.id}-${idx}`} className="font-normal cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading form...</div>;
  }

  if (questions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No additional questions for this industry.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Answer these questions to help diggers understand your needs better.
      </div>
      
      {questions.map((question) => (
        <div key={question.id} className="space-y-2">
          <Label className="text-base">
            {question.question_text}
            {question.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {renderQuestion(question)}
        </div>
      ))}
    </div>
  );
};
