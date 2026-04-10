/**
 * RichTextEditor — shared TipTap wrapper replacing ReactQuill across the plugin.
 *
 * Props:
 *   value          {string}    HTML string (read on mount / when resetKey changes)
 *   onChange       {fn}        Called with HTML string on every change
 *   onImageInsert  {fn|null}   Optional. Called when toolbar image button is clicked.
 *                              Should resolve a media URL and call insertImage(url).
 *                              Signature: (insertImage: (url: string) => void) => void
 *   placeholder    {string}
 *   minHeight      {number}    px, default 200
 *   resetKey       {any}       Change this to force the editor to re-init with new value
 *                              (mirrors the ReactQuill `key` prop pattern used across the plugin)
 *   className      {string}
 */

import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Plus, Minus, Trash2, X, Heading1, Heading2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/tiptap-editor.css';

// ── DB HTML cleanup ────────────────────────────────────────────────────────
// Replicates the cleanup that was in ReactQuill's clipboard matchers:
// strips color/background/font-size inline styles, removes empty style attrs,
// and collapses stray whitespace between block tags.

const STYLE_PROPS_TO_STRIP = ['color', 'background', 'background-color', 'font-size', 'font-family'];

const stripInlineStyles = (html) => {
  if (!html || typeof html !== 'string') return '';

  // Use a temporary DOM element so we get proper HTML parsing
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  wrapper.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style') || '';
    // Remove the unwanted properties, keep anything else (e.g. text-align)
    const cleaned = style
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        const prop = s.split(':')[0].trim().toLowerCase();
        return !STYLE_PROPS_TO_STRIP.includes(prop);
      })
      .join('; ');

    if (cleaned) {
      el.setAttribute('style', cleaned);
    } else {
      el.removeAttribute('style');
    }
  });

  // Also remove <font> tags (old Word/Outlook HTML), unwrap their children
  wrapper.querySelectorAll('font').forEach(el => {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // Collapse whitespace-only text nodes between block elements
  let result = wrapper.innerHTML;
  result = result.replace(/(<\/(?:p|h[1-6]|li|ul|ol|table|tr|td|th|div)>)\s+(<)/gi, '$1$2');

  return result;
};

// ── Toolbar ────────────────────────────────────────────────────────────────

const Divider = () => <span className="tiptap-divider" />;

const ToolbarButton = ({ onClick, active, title, children, disabled }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault(); // keep editor focus
      if (!disabled) onClick();
    }}
    className={active ? 'is-active' : ''}
    title={title}
    disabled={disabled}
  >
    {children}
  </button>
);

const Toolbar = ({ editor, onImageInsert, borderColor, textColor }) => {
  if (!editor) return null;

  const handleImage = () => {
    if (!onImageInsert) return;
    onImageInsert((url) => {
      editor.chain().focus().setImage({ src: url }).run();
    });
  };

  const handleLink = () => {
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('URL del enlace', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  };

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const inTable = editor.isActive('table');

  return (
    <div
      className="tiptap-toolbar"
      style={{ borderColor, color: textColor }}
    >
      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      ><Heading1 size={14} /></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      ><Heading2 size={14} /></ToolbarButton>

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      ><Bold size={14} /></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      ><Italic size={14} /></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      ><UnderlineIcon size={14} /></ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      ><List size={14} /></ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Ordered list"
      ><ListOrdered size={14} /></ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton
        onClick={handleLink}
        active={editor.isActive('link')}
        title="Link"
      ><LinkIcon size={14} /></ToolbarButton>

      {/* Image — only shown when onImageInsert is provided */}
      {onImageInsert && (
        <ToolbarButton onClick={handleImage} title="Insert image">
          <ImageIcon size={14} />
        </ToolbarButton>
      )}

      <Divider />

      {/* Table controls */}
      <ToolbarButton onClick={handleInsertTable} title="Insert table">
        <TableIcon size={14} />
      </ToolbarButton>
      {inTable && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add row below"
          ><Plus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>R</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add column right"
          ><Plus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>C</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete row"
          ><Minus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>R</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete column"
          ><Minus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>C</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete table"
          ><Trash2 size={13} /></ToolbarButton>
        </>
      )}

      <Divider />

      {/* Clear formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear formatting"
      ><X size={14} /></ToolbarButton>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const RichTextEditor = ({
  value = '',
  onChange,
  onImageInsert,
  placeholder = '',
  minHeight = 200,
  resetKey,
  className = '',
}) => {
  const { isDarkMode, getColor } = useTheme();

  const borderColor = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const bgColor     = isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const textColor   = isDarkMode ? getColor('textPrimary', '#f9fafb') : '#1a202c';

  // Track whether we've set initial content for this resetKey.
  const initializedKey = useRef(null);

  const editor = useEditor({
    extensions: [
      // Disable extensions that StarterKit 3.x includes but we configure separately
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none',
        style: `min-height:${minHeight}px; color:${textColor};`,
      },
    },
    onUpdate({ editor }) {
      if (onChange) onChange(editor.getHTML());
    },
  });

  // Set initial content when editor is ready OR when resetKey changes.
  // Mirrors the `clipboard.dangerouslyPasteHTML` pattern used with Quill
  // to ensure empty paragraphs are preserved.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (initializedKey.current === resetKey) return; // already set for this key

    initializedKey.current = resetKey;

    // Strip color/background/font-size styles inherited from DB inconsistencies,
    // then suppress the onChange event so the parent isn't notified on init.
    const html = stripInlineStyles(value || '');
    editor.commands.setContent(html, false);
  }, [editor, resetKey, value]);

  if (!editor) return null;

  return (
    <div
      className={`tiptap-editor-wrap explanation-editor rounded-lg overflow-hidden ${isDarkMode ? 'dark' : ''} ${className}`}
      style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor }}
    >
      <Toolbar
        editor={editor}
        onImageInsert={onImageInsert}
        borderColor={borderColor}
        textColor={textColor}
      />
      <EditorContent
        editor={editor}
        style={{ minHeight: `${minHeight}px`, color: textColor }}
      />
    </div>
  );
};

export default RichTextEditor;
