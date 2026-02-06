import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, X, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";

// Define the shape of extracted gig data
export interface ExtractedGigData {
  problemId?: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

interface FloatingVoiceAgentProps {
  onDataExtracted?: (data: ExtractedGigData) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function FloatingVoiceAgent({ 
  onDataExtracted, 
  isOpen = false, 
  onClose 
}: FloatingVoiceAgentProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedGigData>({});
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{role: string; text: string}>>([]);

  // Handle the client tool calls from the agent
  const handleUpdateGigDetails = useCallback((params: ExtractedGigData) => {
    console.log("Agent extracted data:", params);
    
    // Merge with existing data (don't overwrite with undefined)
    const newData = { ...extractedData };
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        (newData as any)[key] = value;
      }
    });
    
    setExtractedData(newData);
    
    // Notify parent component
    if (onDataExtracted) {
      onDataExtracted(newData);
    }
    
    return "Form updated successfully";
  }, [extractedData, onDataExtracted]);

  const conversation = useConversation({
    clientTools: {
      update_gig_details: handleUpdateGigDetails,
    },
    onConnect: () => {
      console.log("Connected to Morgan");
      toast.success("Connected! Start describing your project.");
    },
    onDisconnect: () => {
      console.log("Disconnected from Morgan");
      setIsConnecting(false);
    },
    onMessage: (message: unknown) => {
      console.log("Message from agent:", message);
      
      // Handle transcripts - cast to any for flexibility with different message types
      const msg = message as any;
      if (msg?.type === "user_transcript") {
        const userText = msg.user_transcription_event?.user_transcript;
        if (userText) {
          setTranscriptHistory(prev => [...prev, { role: "user", text: userText }]);
        }
      } else if (msg?.type === "agent_response") {
        const agentText = msg.agent_response_event?.agent_response;
        if (agentText) {
          setTranscriptHistory(prev => [...prev, { role: "agent", text: agentText }]);
        }
      }
    },
    onError: (error) => {
      console.error("Voice agent error:", error);
      toast.error("Connection error. Please try again.");
      setIsConnecting(false);
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from edge function
      const data = await invokeEdgeFunction<{ signedUrl?: string }>(
        supabase,
        "elevenlabs-conversation-token"
      );

      if (!data?.signedUrl) {
        throw new Error("No signed URL received");
      }

      // Start the conversation with WebSocket using signed URL
      await conversation.startSession({
        signedUrl: data.signedUrl,
      });
    } catch (error: any) {
      console.error("Failed to start conversation:", error);

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Microphone access required", {
          description: "Please allow microphone access to use voice features.",
        });
      } else if (
        (error instanceof DOMException && error.name === "NotFoundError") ||
        (error?.message && String(error.message).toLowerCase().includes("device not found"))
      ) {
        toast.error("No microphone found", {
          description: "Connect a microphone or headset and refresh the page, or use the form to type your project details.",
        });
      } else if (
        error?.message?.includes("socket error") ||
        error?.message?.includes("connection was closed") ||
        error?.name === "SessionConnectionError"
      ) {
        toast.error("Voice connection failed", {
          description: "Check your internet connection, refresh the page, and try again. You can also use the form to type your project details.",
        });
      } else if (
        error?.message?.includes("rawAudioProcessor worklet") ||
        error?.message?.includes("AudioWorklet") ||
        error?.message?.includes("worklet module")
      ) {
        toast.error("Voice setup failed", {
          description: "Try refreshing the page or use a different browser (e.g. Chrome). You can also use the form to type your project details.",
        });
      } else {
        toast.error(error?.message || "Couldn't connect to voice agent", {
          description: "Please try again or use the form instead.",
        });
      }
      setIsConnecting(false);
    }
  }, [conversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsConnecting(false);
  }, [conversation]);

  const handleClose = () => {
    if (conversation.status === "connected") {
      stopConversation();
    }
    onClose?.();
  };

  if (!isOpen) return null;

  const isConnected = conversation.status === "connected";
  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isConnected ? "bg-success/20" : "bg-primary/20"
            }`}>
              <Phone className={`h-5 w-5 ${isConnected ? "text-success" : "text-primary"}`} />
            </div>
            <div>
              <h3 className="font-semibold">Morgan</h3>
              <p className="text-xs text-muted-foreground">
                {isConnected 
                  ? isSpeaking ? "Speaking..." : "Listening..." 
                  : "AI Project Assistant"
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status indicator */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-center">
            {isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                  isSpeaking ? "bg-accent/20 animate-pulse" : "bg-success/20"
                }`}>
                  {isSpeaking ? (
                    <div className="flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-accent rounded-full animate-pulse"
                          style={{ 
                            height: `${20 + Math.random() * 20}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Mic className="h-8 w-8 text-success" />
                  )}
                </div>
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                  {isSpeaking ? "Morgan is speaking" : "Listening to you"}
                </Badge>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Click the button below to start talking with Morgan. 
                  He'll help capture your project details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Extracted data preview */}
        {Object.keys(extractedData).length > 0 && (
          <div className="p-4 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Captured so far:</p>
            <div className="flex flex-wrap gap-2">
              {extractedData.problemId && (
                <Badge variant="outline" className="text-xs">
                  Type: {extractedData.problemId}
                </Badge>
              )}
              {(extractedData.budgetMin || extractedData.budgetMax) && (
                <Badge variant="outline" className="text-xs">
                  Budget: ${extractedData.budgetMin || '?'} - ${extractedData.budgetMax || '?'}
                </Badge>
              )}
              {extractedData.timeline && (
                <Badge variant="outline" className="text-xs">
                  Timeline: {extractedData.timeline}
                </Badge>
              )}
              {extractedData.clientName && (
                <Badge variant="outline" className="text-xs">
                  Name: {extractedData.clientName}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Transcript history (last 3 messages) */}
        {transcriptHistory.length > 0 && (
          <div className="p-4 border-b border-border max-h-32 overflow-y-auto">
            <div className="space-y-2">
              {transcriptHistory.slice(-3).map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`text-xs ${msg.role === "user" ? "text-right" : "text-left"}`}
                >
                  <span className={`inline-block px-2 py-1 rounded ${
                    msg.role === "user" ? "bg-primary/10 text-primary" : "bg-muted"
                  }`}>
                    {msg.text.substring(0, 100)}{msg.text.length > 100 ? "..." : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4">
          {isConnected ? (
            <Button 
              onClick={stopConversation} 
              variant="destructive" 
              className="w-full"
            >
              <MicOff className="mr-2 h-4 w-4" />
              End Conversation
            </Button>
          ) : (
            <Button 
              onClick={startConversation} 
              disabled={isConnecting}
              className="w-full bg-gradient-primary"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Talking to Morgan
                </>
              )}
            </Button>
          )}
        </div>

        {/* Privacy note */}
        <div className="px-4 pb-4">
          <p className="text-[10px] text-center text-muted-foreground">
            Your conversation is processed securely. Information is only shared when you submit the form.
          </p>
        </div>
      </Card>
    </div>
  );
}
