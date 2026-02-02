import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Smile,
  Undo,
  Redo,
} from "lucide-react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";

const extensions = [
  StarterKit,
  Image.configure({ inline: false, allowBase64: true }),
  Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank" } }),
  Placeholder.configure({ placeholder: "Write your email content… Use the toolbar for bold, lists, links, images, and emojis." }),
];

export interface EmailTemplateEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Optional: called with a function that returns current editor HTML (for capturing at send time). */
  getHtmlRef?: React.MutableRefObject<(() => string) | null>;
  minHeight?: string;
  className?: string;
}

export function EmailTemplateEditor({
  value,
  onChange,
  getHtmlRef,
  minHeight = "280px",
  className = "",
}: EmailTemplateEditorProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);

  const editor = useEditor({
    extensions,
    content: value || "",
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                editor?.chain().focus().setImage({ src: result }).run();
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== undefined && value !== current) {
      editor.commands.setContent(value ?? "");
    }
  }, [value]);

  useEffect(() => {
    if (!getHtmlRef || !editor) return;
    getHtmlRef.current = () => editor.getHTML();
    return () => {
      getHtmlRef.current = null;
    };
  }, [editor, getHtmlRef]);

  if (!editor) return null;

  const addEmoji = (data: EmojiClickData) => {
    editor.chain().focus().insertContent(data.emoji).run();
    onChange(editor.getHTML());
  };

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkPopover(false);
      onChange(editor.getHTML());
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImagePopover(false);
      onChange(editor.getHTML());
    }
  };

  return (
    <div className={`rounded-md border bg-background ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-0.5" />
        <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Button type="button" size="sm" onClick={addLink}>
                Insert link
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <ImagePlus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <Label>Image URL (or GIF link)</Label>
              <Input
                placeholder="https://example.com/image.gif"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addImage()}
              />
              <Button type="button" size="sm" onClick={addImage}>
                Insert image
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0" align="start">
            <EmojiPicker onEmojiClick={addEmoji} width={320} height={400} />
          </PopoverContent>
        </Popover>
        <div className="w-px h-6 bg-border mx-0.5" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      <div style={{ minHeight }} className="[&_.ProseMirror]:min-h-[200px]">
        <EditorContent
          editor={editor}
          className="prose prose-sm dark:prose-invert max-w-none p-3 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        />
      </div>
      {editor.isActive("link") && (
        <BubbleMenu editor={editor}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            Remove link
          </Button>
        </BubbleMenu>
      )}
    </div>
  );
}
