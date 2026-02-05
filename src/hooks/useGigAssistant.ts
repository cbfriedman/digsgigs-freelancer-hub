import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";

export interface GigData {
  problemId: string;
  clarifyingAnswer: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  isComplete: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_DATA: GigData = {
  problemId: "",
  clarifyingAnswer: "",
  description: "",
  budgetMin: null,
  budgetMax: null,
  timeline: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  isComplete: false,
};

export function useGigAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! 👋 I'm here to help you post your project. Tell me — what do you need help with today?",
    },
  ]);
  const [extractedData, setExtractedData] = useState<GigData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: Message = { role: "user", content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const data = await invokeEdgeFunction<{ content?: string; extractedData?: GigData }>(
        supabase,
        "gig-assistant-chat",
        {
          body: {
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            currentData: extractedData,
          },
        }
      );

      // Add assistant response
      if (data?.content) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      }

      // Update extracted data
      if (data.extractedData) {
        setExtractedData((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.extractedData).filter(([_, v]) => v !== null && v !== undefined && v !== "")
          ),
        }));
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, extractedData, isLoading]);

  const resetConversation = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! 👋 I'm here to help you post your project. Tell me — what do you need help with today?",
      },
    ]);
    setExtractedData(INITIAL_DATA);
  }, []);

  const updateField = useCallback((field: keyof GigData, value: any) => {
    setExtractedData((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    messages,
    extractedData,
    isLoading,
    sendMessage,
    resetConversation,
    updateField,
  };
}
