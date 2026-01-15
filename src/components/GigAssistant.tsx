import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, Circle, Edit2, ArrowRight, RotateCcw } from "lucide-react";
import { useGigAssistant, GigData } from "@/hooks/useGigAssistant";
import { cn } from "@/lib/utils";

interface GigAssistantProps {
  onSubmit: (data: GigData) => void;
  onSwitchToForm: () => void;
}

const FIELD_LABELS: Record<keyof Omit<GigData, "isComplete">, string> = {
  problemId: "Project Type",
  clarifyingAnswer: "Details",
  description: "Description",
  budgetMin: "Min Budget",
  budgetMax: "Max Budget",
  timeline: "Timeline",
  clientName: "Name",
  clientEmail: "Email",
  clientPhone: "Phone",
};

const REQUIRED_FIELDS: (keyof GigData)[] = [
  "problemId",
  "clarifyingAnswer",
  "description",
  "budgetMin",
  "budgetMax",
  "timeline",
  "clientName",
  "clientEmail",
];

export function GigAssistant({ onSubmit, onSwitchToForm }: GigAssistantProps) {
  const { messages, extractedData, isLoading, sendMessage, resetConversation, updateField } = useGigAssistant();
  const [input, setInput] = useState("");
  const [editingField, setEditingField] = useState<keyof GigData | null>(null);
  const [editValue, setEditValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEditField = (field: keyof GigData) => {
    setEditingField(field);
    const value = extractedData[field];
    setEditValue(value?.toString() || "");
  };

  const handleSaveEdit = () => {
    if (editingField && editValue.trim()) {
      let finalValue: string | number = editValue.trim();
      if (editingField === "budgetMin" || editingField === "budgetMax") {
        finalValue = parseInt(editValue.replace(/[^0-9]/g, "")) || 0;
      }
      updateField(editingField, finalValue);
    }
    setEditingField(null);
    setEditValue("");
  };

  const completedFields = REQUIRED_FIELDS.filter((field) => {
    const value = extractedData[field];
    return value !== null && value !== undefined && value !== "";
  });

  const progressPercentage = (completedFields.length / REQUIRED_FIELDS.length) * 100;
  const isReadyToSubmit = completedFields.length === REQUIRED_FIELDS.length;

  const formatFieldValue = (field: keyof GigData, value: any): string => {
    if (value === null || value === undefined || value === "") return "—";
    if (field === "budgetMin" || field === "budgetMax") {
      return `$${Number(value).toLocaleString()}`;
    }
    if (field === "timeline") {
      const labels: Record<string, string> = {
        asap: "ASAP",
        "1-2-weeks": "1-2 weeks",
        "1-2-months": "1-2 months",
        exploring: "Just exploring",
      };
      return labels[value] || value;
    }
    if (field === "problemId") {
      const labels: Record<string, string> = {
        "build-website": "Build a website",
        "build-webapp": "Build a web app",
        design: "Design work",
        marketing: "Marketing",
        content: "Content creation",
        automation: "AI & Automation",
        "business-systems": "Business systems",
        other: "Other",
      };
      return labels[value] || value;
    }
    return String(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Area */}
      <div className="lg:col-span-2">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Chat with AI Assistant</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetConversation}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Start Over
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Prefer forms?{" "}
                <button
                  onClick={onSwitchToForm}
                  className="text-primary underline hover:no-underline"
                >
                  Switch to form view
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extracted Data Panel */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Project Details
              <Badge variant={isReadyToSubmit ? "default" : "secondary"}>
                {completedFields.length}/{REQUIRED_FIELDS.length}
              </Badge>
            </CardTitle>
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(FIELD_LABELS) as (keyof Omit<GigData, "isComplete">)[]).map((field) => {
              const value = extractedData[field];
              const hasValue = value !== null && value !== undefined && value !== "";
              const isRequired = REQUIRED_FIELDS.includes(field);
              const isEditing = editingField === field;

              return (
                <div key={field} className="flex items-start gap-2">
                  {isRequired ? (
                    hasValue ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-muted-foreground">
                        {FIELD_LABELS[field]}
                        {!isRequired && " (optional)"}
                      </span>
                      {hasValue && !isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1 mt-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") setEditingField(null);
                          }}
                        />
                        <Button size="sm" className="h-7 px-2" onClick={handleSaveEdit}>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          "text-sm truncate",
                          hasValue ? "text-foreground" : "text-muted-foreground"
                        )}
                        title={formatFieldValue(field, value)}
                      >
                        {formatFieldValue(field, value)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Submit Button */}
            <div className="pt-4 border-t mt-4">
              <Button
                className="w-full"
                size="lg"
                disabled={!isReadyToSubmit}
                onClick={() => onSubmit(extractedData)}
              >
                {isReadyToSubmit ? (
                  <>
                    Review & Submit
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  "Complete all fields to submit"
                )}
              </Button>
              {!isReadyToSubmit && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Keep chatting to fill in the remaining details
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
