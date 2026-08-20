import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  ImagePlus,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';

// The resize/align extension stores width & alignment on the <img> via non-standard
// `containerstyle`/`wrapperstyle` attributes that only the live editor's NodeView
// understands. Flatten them into a real `style` attribute so the saved HTML also
// renders correctly in the read-only card preview (plain dangerouslySetInnerHTML).
function normalizeResizedImages(html: string): string {
  if (typeof document === 'undefined' || !html.includes('style')) return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('img[containerstyle], img[wrapperstyle]').forEach((img) => {
    const containerStyle = img.getAttribute('containerstyle') || '';
    const wrapperStyle = img.getAttribute('wrapperstyle') || '';
    img.removeAttribute('containerstyle');
    img.removeAttribute('wrapperstyle');
    if (containerStyle) img.setAttribute('style', containerStyle);
    if (wrapperStyle) {
      const outer = document.createElement('div');
      outer.setAttribute('style', wrapperStyle);
      img.replaceWith(outer);
      outer.appendChild(img);
    }
  });
  return container.innerHTML;
}

interface RichNoteEditorProps {
  content: string;
  onChange: (html: string, plainText: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  placeholder?: string;
  isDark: boolean;
  accentColor: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function insertImageFile(editor: Editor, file: File, onUploadImage: (file: File) => Promise<string>) {
  if (!file.type.startsWith('image/')) return;
  const base64 = await fileToBase64(file);
  editor.chain().focus().setImage({ src: base64 }).run();
  try {
    const finalUrl = await onUploadImage(file);
    if (finalUrl && finalUrl !== base64) {
      const { state } = editor;
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'imageResize' && node.attrs.src === base64) {
          editor.chain().command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: finalUrl });
            return true;
          }).run();
        }
      });
    }
  } catch {
    // keep the local base64 fallback already inserted
  }
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  isDark: boolean;
  accentColor: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, isDark, accentColor, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className="p-1.5 rounded-lg transition-colors cursor-pointer"
    style={
      active
        ? { backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}40` }
        : {
            color: isDark ? '#94a3b8' : '#64748b',
            border: '1px solid transparent',
          }
    }
  >
    {children}
  </button>
);

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  content,
  onChange,
  onUploadImage,
  placeholder,
  isDark,
  accentColor,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      ImageResize.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Escreva seu resumo...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'rich-note-content text-xs sm:text-sm leading-relaxed',
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImageFile(editor as Editor, file, onUploadImage));
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return false;
        event.preventDefault();
        files.forEach((file) => insertImageFile(editor as Editor, file, onUploadImage));
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(normalizeResizedImages(editor.getHTML()), editor.getText());
    },
  });

  if (!editor) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL do link:', previousUrl || 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await insertImageFile(editor, file, onUploadImage);
    }
    e.target.value = '';
  };

  const barClasses = isDark
    ? 'bg-slate-900/80 border-slate-700'
    : 'bg-white border-slate-300';

  const toolbar = (
    <div
      className={`flex flex-wrap items-center gap-0.5 p-1.5 border-b ${
        isDark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <ToolbarButton title="Negrito" isDark={isDark} accentColor={accentColor} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Itálico" isDark={isDark} accentColor={accentColor} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Tachado" isDark={isDark} accentColor={accentColor} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton title="Título 1" isDark={isDark} accentColor={accentColor} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Título 2" isDark={isDark} accentColor={accentColor} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton title="Lista com marcadores" isDark={isDark} accentColor={accentColor} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Lista numerada" isDark={isDark} accentColor={accentColor} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Checklist" isDark={isDark} accentColor={accentColor} active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <ListChecks className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Citação" isDark={isDark} accentColor={accentColor} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton title="Alinhar à esquerda" isDark={isDark} accentColor={accentColor} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Centralizar" isDark={isDark} accentColor={accentColor} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Alinhar à direita" isDark={isDark} accentColor={accentColor} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Justificar" isDark={isDark} accentColor={accentColor} active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
        <AlignJustify className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton title="Inserir/editar link" isDark={isDark} accentColor={accentColor} active={editor.isActive('link')} onClick={handleSetLink}>
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Inserir imagem" isDark={isDark} accentColor={accentColor} onClick={() => fileInputRef.current?.click()}>
        <ImagePlus className="w-3.5 h-3.5" />
      </ToolbarButton>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilePick} className="hidden" />

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton title="Desfazer" isDark={isDark} accentColor={accentColor} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Refazer" isDark={isDark} accentColor={accentColor} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className={`w-px h-4 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

      <ToolbarButton
        title={isExpanded ? 'Sair da tela cheia' : 'Expandir para tela cheia'}
        isDark={isDark}
        accentColor={accentColor}
        active={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
      >
        {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </ToolbarButton>
    </div>
  );

  const editorContent = (
    <EditorContent
      editor={editor}
      className={`px-3 py-2.5 ${isExpanded ? 'flex-1 overflow-y-auto' : 'min-h-[45vh]'} ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    />
  );

  if (isExpanded) {
    return (
      <div
        className={`fixed inset-0 z-60 flex flex-col ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}
        style={{ ['--rich-note-accent' as any]: accentColor }}
      >
        {toolbar}
        {editorContent}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col ${barClasses}`} style={{ ['--rich-note-accent' as any]: accentColor }}>
      {toolbar}
      {editorContent}
    </div>
  );
};
