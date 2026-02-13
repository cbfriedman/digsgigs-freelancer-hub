import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Smile, Paperclip, Image, X } from "lucide-react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** Called when user sends with attachments. Parent should upload, send message with content + attachments, then clear message. */
  onFileSelect?: (files: File[], content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  /** Optional ref for the textarea so parent can focus it (e.g. after sending). */
  inputRef?: React.Ref<HTMLTextAreaElement | null>;
  /** Called when the message input receives focus (e.g. to mark conversation as read). */
  onInputFocus?: () => void;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onFileSelect,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 5000,
  className,
  inputRef: inputRefProp,
  onInputFocus,
}: MessageInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRefMerged = useCallback(
    (node: HTMLTextAreaElement | null) => {
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      if (inputRefProp) {
        if (typeof inputRefProp === "function") inputRefProp(node);
        else (inputRefProp as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [inputRefProp]
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    if (list.length > 0) {
      setSelectedFiles(prev => [...prev, ...list]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      onChange(newValue);
      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      onChange(value + emoji);
    }
    setShowEmojiPicker(false);
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || selectedFiles.length > 0) {
        handleSend();
      }
    }
  };

  const handleSend = () => {
    if (selectedFiles.length > 0 && onFileSelect) {
      onFileSelect(selectedFiles, value.trim());
      setSelectedFiles([]);
      onChange("");
      return;
    }
    if (value.trim()) {
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) addFiles(files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isDisabled = disabled || (!value.trim() && selectedFiles.length === 0);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-background rounded-md px-2 py-1.5 border border-border/50 text-sm group"
            >
              {file.type.startsWith("image/") ? (
                <Image className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate max-w-[120px] text-foreground">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="h-4 w-4 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area with drag-and-drop */}
      <div
        role="region"
        aria-label="Message composer"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex items-end gap-2 bg-card rounded-xl border border-border/50 p-2 shadow-card transition-shadow focus-within:shadow-md focus-within:border-primary/30",
          isDragging && "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 shrink-0 pb-1">
          {/* Emoji picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 border-0 shadow-lg z-[110]" 
              align="start"
              side="top"
              sideOffset={8}
            >
              <EmojiPicker 
                onEmojiClick={handleEmojiClick} 
                width={320} 
                height={400}
                searchPlaceholder="Search emoji..."
              />
            </PopoverContent>
          </Popover>

          {/* Attach any file (images, PDF, doc, zip, etc.) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
            title="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
            accept="*"
          />
        </div>

        {/* Textarea */}
        <Textarea
          ref={textareaRefMerged}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onInputFocus}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 px-0 text-sm placeholder:text-muted-foreground/70"
          rows={1}
        />

        {/* Send button */}
        <Button
          type="button"
          onClick={handleSend}
          disabled={isDisabled}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg bg-primary hover:bg-primary-hover shadow-primary transition-all hover:shadow-primary-lg disabled:opacity-50 disabled:shadow-none"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character count */}
      {value.length > maxLength * 0.8 && (
        <p className={cn(
          "text-xs text-right",
          value.length >= maxLength ? "text-destructive" : "text-muted-foreground"
        )}>
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

export default MessageInput;
