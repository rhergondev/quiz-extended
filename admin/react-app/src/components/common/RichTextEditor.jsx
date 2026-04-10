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

import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Table as TableIcon, Plus, Minus, Trash2, X, Heading1, Heading2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';

// ── Custom table cell extensions with backgroundColor support ──────────────
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
        renderHTML: attrs => attrs.backgroundColor
          ? { style: `background-color: ${attrs.backgroundColor}` }
          : {},
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
        renderHTML: attrs => attrs.backgroundColor
          ? { style: `background-color: ${attrs.backgroundColor}` }
          : {},
      },
    };
  },
});
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/tiptap-editor.css';

// ── DB HTML cleanup ────────────────────────────────────────────────────────
// Replicates the cleanup that was in ReactQuill's clipboard matchers:
// strips color/background/font-size inline styles, removes empty style attrs,
// and collapses stray whitespace between block tags.

// Stripped from all elements (Word/Outlook paste artifacts on text)
const STYLE_PROPS_TO_STRIP = ['color', 'background', 'background-color', 'font-size', 'font-family'];
// Background is intentional on table cells — keep it there
const TABLE_CELL_TAGS = new Set(['TD', 'TH']);

const stripInlineStyles = (html) => {
  if (!html || typeof html !== 'string') return '';

  // Use a temporary DOM element so we get proper HTML parsing
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  wrapper.querySelectorAll('[style]').forEach(el => {
    const isTableCell = TABLE_CELL_TAGS.has(el.tagName);
    const style = el.getAttribute('style') || '';
    // For table cells, keep background-color (intentional cell highlight).
    // For everything else, strip all STYLE_PROPS_TO_STRIP.
    const propsToStrip = isTableCell
      ? STYLE_PROPS_TO_STRIP.filter(p => p !== 'background' && p !== 'background-color')
      : STYLE_PROPS_TO_STRIP;

    const cleaned = style
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false;
        const prop = s.split(':')[0].trim().toLowerCase();
        return !propsToStrip.includes(prop);
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

// Convert #rrggbb to [r, g, b]
const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const CELL_COLOR_OPACITIES = [0.12, 0.25, 0.45, 0.65];
const CELL_COLOR_LABELS    = ['Muy suave', 'Suave', 'Medio', 'Intenso'];

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

const Toolbar = ({ editor, onImageInsert, borderColor, textColor, accentColor, inTable }) => {
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

  return (
    <div className="tiptap-toolbar-wrap">
      {/* ── Row 1: always-visible formatting controls ── */}
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

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        ><AlignLeft size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        ><AlignCenter size={14} /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        ><AlignRight size={14} /></ToolbarButton>

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

        {/* Table insert */}
        <ToolbarButton onClick={handleInsertTable} title="Insert table">
          <TableIcon size={14} />
        </ToolbarButton>

        <Divider />

        {/* Clear formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear formatting"
        ><X size={14} /></ToolbarButton>
      </div>

      {/* ── Row 2: table controls — only visible when cursor is inside a table ── */}
      {inTable && (
        <div
          className="tiptap-toolbar tiptap-toolbar-table"
          style={{ borderColor, color: textColor }}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add row below"
          ><Plus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>F</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add column right"
          ><Plus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>C</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete row"
          ><Minus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>F</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete column"
          ><Minus size={12} /><span style={{ fontSize: '9px', lineHeight: 1 }}>C</span></ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete table"
          ><Trash2 size={13} /></ToolbarButton>

          <Divider />

          {/* Cell background — theme accent in 4 opacity levels + clear */}
          {(() => {
            const [r, g, b] = hexToRgb(accentColor || '#6366f1');
            return [
              ...CELL_COLOR_OPACITIES.map((alpha, i) => ({
                label: CELL_COLOR_LABELS[i],
                value: `rgba(${r},${g},${b},${alpha})`,
              })),
              { label: 'Sin color', value: null },
            ].map(({ label, value }) => (
              <span
                key={label}
                title={label}
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().updateAttributes('tableCell', { backgroundColor: value }).run();
                  editor.chain().focus().updateAttributes('tableHeader', { backgroundColor: value }).run();
                }}
                style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  border: '1px solid rgba(128,128,128,0.3)',
                  backgroundColor: value || undefined,
                  backgroundImage: value ? undefined : 'linear-gradient(45deg,#aaa 25%,transparent 25%,transparent 75%,#aaa 75%),linear-gradient(45deg,#aaa 25%,transparent 25%,transparent 75%,#aaa 75%)',
                  backgroundSize: value ? undefined : '6px 6px',
                  backgroundPosition: value ? undefined : '0 0,3px 3px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            ));
          })()}
        </div>
      )}
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

  const borderColor  = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const bgColor      = isDarkMode ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const textColor    = isDarkMode ? getColor('textPrimary', '#f9fafb') : '#1a202c';
  const accentColor  = getColor('accent', '#6366f1');

  // Track whether we've set initial content for this resetKey.
  const initializedKey = useRef(null);
  const [inTable, setInTable] = useState(false);

  const editor = useEditor({
    extensions: [
      // Disable extensions that StarterKit 3.x includes but we configure separately
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
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
      setInTable(editor.isActive('table'));
    },
    onSelectionUpdate({ editor }) {
      setInTable(editor.isActive('table'));
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
        accentColor={accentColor}
        inTable={inTable}
      />
      <EditorContent
        editor={editor}
        style={{ minHeight: `${minHeight}px`, color: textColor }}
      />
    </div>
  );
};

export default RichTextEditor;
