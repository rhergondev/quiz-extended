import React, { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLessons } from '../../../hooks/useLessons';
import CourseSidebar from '../../../components/course/CourseSidebar';
import LessonCalendar from '../../../components/calendar/LessonCalendar';
import { Calendar, ChevronRight, Loader, Video, FileText, ClipboardList, X, Plus, Edit2, Trash2, StickyNote, Download, ExternalLink } from 'lucide-react';
import { isUserAdmin } from '../../../utils/userUtils';
import { getCalendarNotes, createCalendarNote, updateCalendarNote, deleteCalendarNote } from '../../../api/services/calendarNotesService';
import { createNotification } from '../../../api/services/notificationsService';

/**
 * LessonDetailModal - Modal to show lesson details when clicked
 */
const LessonDetailModal = ({ lesson, onClose, pageColors, getColor, isDarkMode }) => {
  const { t } = useTranslation();
  
  if (!lesson) return null;

  const lessonType = lesson.meta?._lesson_type || 'default';
  const startDate = lesson.meta?._start_date 
    ? new Date(lesson.meta._start_date).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      })
    : t('calendar.noDate', 'Sin fecha');
  
  const typeLabels = {
    video: t('lessons.types.video', 'Video'),
    test: t('lessons.types.test', 'Test'),
    pdf: t('lessons.types.pdf', 'PDF'),
    default: t('lessons.types.lesson', 'Lección'),
  };

  const TypeIcon = lessonType === 'video' ? Video : lessonType === 'test' ? ClipboardList : FileText;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all"
        style={{ backgroundColor: pageColors.bgCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: pageColors.hoverBg }}
            >
              <TypeIcon size={24} style={{ color: pageColors.text }} />
            </div>
            <span 
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: pageColors.hoverBg,
                color: pageColors.text
              }}
            >
              {typeLabels[lessonType] || typeLabels.default}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: pageColors.hoverBg }}
          >
            <X size={18} style={{ color: pageColors.text }} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-4" style={{ color: pageColors.text }}>
          {lesson.title?.rendered || lesson.title || t('calendar.untitledLesson', 'Lección sin título')}
        </h3>

        {/* Details */}
        <div className="space-y-3">
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: pageColors.bgSubtle }}
          >
            <Calendar size={18} style={{ color: pageColors.textMuted }} />
            <div>
              <div className="text-xs" style={{ color: pageColors.textMuted }}>
                {t('calendar.startDate', 'Fecha de inicio')}
              </div>
              <div className="font-semibold" style={{ color: pageColors.text }}>
                {startDate}
              </div>
            </div>
          </div>

          {lesson.meta?._lesson_order !== undefined && (
            <div 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: pageColors.bgSubtle }}
            >
              <span className="text-sm font-mono" style={{ color: pageColors.textMuted }}>#</span>
              <div>
                <div className="text-xs" style={{ color: pageColors.textMuted }}>
                  {t('calendar.order', 'Orden')}
                </div>
                <div className="font-semibold" style={{ color: pageColors.text }}>
                  {lesson.meta._lesson_order}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="mt-6 pt-4 border-t"
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb') }}
        >
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 font-medium rounded-lg transition-opacity hover:opacity-90"
            style={{ 
              backgroundColor: pageColors.primaryBg,
              color: '#ffffff'
            }}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * NoteModal - Modal to create/edit calendar notes (admin only)
 */
const NoteModal = ({ note, onSave, onDelete, onClose, pageColors, getColor, isDarkMode, t, isEditing }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [description, setDescription] = useState(note?.description || '');
  const [noteDate, setNoteDate] = useState(note?.note_date || new Date().toISOString().split('T')[0]);
  const [color, setColor] = useState(note?.color || '#8B5CF6');
  const [saving, setSaving] = useState(false);

  const colors = [
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !noteDate) return;
    
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        note_date: noteDate,
        color
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6"
        style={{ backgroundColor: pageColors.bgCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: color + '20' }}
            >
              <StickyNote size={24} style={{ color }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: pageColors.text }}>
              {isEditing ? t('calendar.editNote', 'Editar nota') : t('calendar.newNote', 'Nueva nota')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: pageColors.hoverBg }}
          >
            <X size={18} style={{ color: pageColors.text }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.noteTitle', 'Título')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              placeholder={t('calendar.noteTitlePlaceholder', 'Ej: Examen parcial')}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.noteDescription', 'Descripción')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors resize-none"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              placeholder={t('calendar.noteDescriptionPlaceholder', 'Añade una descripción opcional...')}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.noteDate', 'Fecha')} *
            </label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              required
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
              {t('calendar.noteColor', 'Color')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2' : ''}`}
                  style={{ 
                    backgroundColor: c,
                    ringColor: c,
                    ringOffsetColor: pageColors.bgCard
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: '#ef4444',
                  color: '#fff'
                }}
              >
                <Trash2 size={16} />
                {t('common.delete', 'Eliminar')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: pageColors.hoverBg,
                color: pageColors.text
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ 
                backgroundColor: pageColors.primaryBg,
                color: '#fff'
              }}
            >
              {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * LiveClassModal - Modal to create/edit live class events (admin only)
 */
const LiveClassModal = ({ liveClass, onSave, onDelete, onClose, pageColors, getColor, isDarkMode, t, isEditing }) => {
  const [title, setTitle] = useState(liveClass?.title || '');
  const [description, setDescription] = useState(liveClass?.description || '');
  const [noteDate, setNoteDate] = useState(liveClass?.note_date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(liveClass?.time?.substring(0, 5) || '');
  const [link, setLink] = useState(liveClass?.link || '');
  const [color, setColor] = useState(liveClass?.color || '#EF4444');
  const [saving, setSaving] = useState(false);

  const colors = [
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !noteDate || !link.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        note_date: noteDate,
        time: time || null,
        link: link.trim(),
        color,
        type: 'live_class'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: pageColors.bgCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: color + '20' }}
            >
              <Video size={24} style={{ color }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: pageColors.text }}>
              {isEditing ? t('calendar.editLiveClass', 'Editar clase') : t('calendar.newLiveClass', 'Nueva clase en directo')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: pageColors.hoverBg }}
          >
            <X size={18} style={{ color: pageColors.text }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.liveClassTitle', 'Título')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              placeholder={t('calendar.liveClassTitlePlaceholder', 'Ej: Clase de repaso tema 5')}
              required
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.liveClassLink', 'Enlace de la reunión')} *
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              placeholder="https://meet.google.com/... o https://teams.microsoft.com/..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
              {t('calendar.liveClassDescription', 'Descripción')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors resize-none"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                color: pageColors.text
              }}
              placeholder={t('calendar.liveClassDescriptionPlaceholder', 'Añade una descripción opcional...')}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
                {t('calendar.liveClassDate', 'Fecha')} *
              </label>
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                  color: pageColors.text
                }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: pageColors.text }}>
                {t('calendar.liveClassTime', 'Hora')}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none transition-colors"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb'),
                  color: pageColors.text
                }}
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: pageColors.text }}>
              {t('calendar.liveClassColor', 'Color')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-offset-2' : ''}`}
                  style={{ 
                    backgroundColor: c,
                    ringColor: c,
                    ringOffsetColor: pageColors.bgCard
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: '#ef4444',
                  color: '#fff'
                }}
              >
                <Trash2 size={16} />
                {t('common.delete', 'Eliminar')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors"
              style={{ 
                backgroundColor: pageColors.hoverBg,
                color: pageColors.text
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !link.trim()}
              className="flex-1 py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ 
                backgroundColor: pageColors.primaryBg,
                color: '#fff'
              }}
            >
              {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * NoteDetailModal - Modal to show note details when clicked (for non-admins or viewing)
 */
const NoteDetailModal = ({ note, onClose, onEdit, pageColors, getColor, isDarkMode, t, isAdmin }) => {
  if (!note) return null;

  const isLiveClass = note.type === 'live_class';
  
  const formattedDate = note.note_date 
    ? new Date(note.note_date).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      })
    : '';

  const formattedTime = note.time 
    ? note.time.substring(0, 5) // HH:MM format
    : '';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6"
        style={{ backgroundColor: pageColors.bgCard }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: (note.color || '#8B5CF6') + '20' }}
            >
              {isLiveClass ? (
                <Video size={24} style={{ color: note.color || '#8B5CF6' }} />
              ) : (
                <StickyNote size={24} style={{ color: note.color || '#8B5CF6' }} />
              )}
            </div>
            <span 
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: (note.color || '#8B5CF6') + '20',
                color: note.color || '#8B5CF6'
              }}
            >
              {isLiveClass ? t('calendar.liveClass', 'Clase en directo') : t('calendar.note', 'Nota')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: pageColors.hoverBg }}
          >
            <X size={18} style={{ color: pageColors.text }} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-4" style={{ color: pageColors.text }}>
          {note.title}
        </h3>

        {/* Description */}
        {note.description && (
          <p className="mb-4" style={{ color: pageColors.textMuted }}>
            {note.description}
          </p>
        )}

        {/* Date and Time */}
        <div 
          className="flex items-center gap-3 p-3 rounded-lg mb-3"
          style={{ backgroundColor: pageColors.bgSubtle }}
        >
          <Calendar size={18} style={{ color: pageColors.textMuted }} />
          <div>
            <div className="text-xs" style={{ color: pageColors.textMuted }}>
              {t('calendar.date', 'Fecha')}
            </div>
            <div className="font-semibold" style={{ color: pageColors.text }}>
              {formattedDate}{formattedTime && ` - ${formattedTime}`}
            </div>
          </div>
        </div>

        {/* Link for live class */}
        {isLiveClass && note.link && (
          <a
            href={note.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-3 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ 
              backgroundColor: note.color || '#8B5CF6',
              color: '#fff'
            }}
          >
            <ExternalLink size={18} />
            {t('calendar.joinClass', 'Unirse a la clase')}
          </a>
        )}

        {/* Footer */}
        <div 
          className={`mt-6 pt-4 border-t flex gap-3`}
          style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb') }}
        >
          {isAdmin && onEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 px-4 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: pageColors.hoverBg,
                color: pageColors.text
              }}
            >
              <Edit2 size={16} />
              {t('common.edit', 'Editar')}
            </button>
          )}
          <button
            onClick={onClose}
            className={`${isAdmin && onEdit ? 'flex-1' : 'w-full'} py-2.5 px-4 font-medium rounded-lg transition-opacity hover:opacity-90`}
            style={{ 
              backgroundColor: pageColors.primaryBg,
              color: '#ffffff'
            }}
          >
            {t('common.close', 'Cerrar')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * StudyPlannerPage - Calendar view of course lessons
 */
const StudyPlannerPage = () => {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const { getColor, isDarkMode } = useTheme();
  const { lessons, loading, error } = useLessons({ courseId, perPage: 100 });
  const navigate = useNavigate();
  
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // Calendar notes state (admin feature)
  const isAdmin = isUserAdmin();
  const [calendarNotes, setCalendarNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLiveClassModal, setShowLiveClassModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Fetch calendar notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!courseId) return;
      setNotesLoading(true);
      try {
        const notes = await getCalendarNotes(courseId);
        setCalendarNotes(notes);
      } catch (err) {
        console.error('Error fetching calendar notes:', err);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
  }, [courseId]);

  // Dark mode aware colors (same pattern as TestHistoryPage)
  const pageColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    bgCard: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    bgSubtle: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}05`,
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}10`,
    hoverBgStrong: isDarkMode ? 'rgba(255,255,255,0.15)' : `${getColor('primary', '#1a202c')}20`,
    primaryBg: getColor('primary', '#1a202c'),
  };

  // Navigate to content based on step/lesson type
  const handleNavigateToContent = useCallback((event) => {
    const { lesson, step, isStep, lessonType } = event;
    
    if (!lesson) return;
    
    // Determine the type and navigate accordingly
    const type = isStep ? (step?.type || 'default') : lessonType;
    
    switch (type) {
      case 'quiz':
      case 'test':
        // For quiz/test steps, navigate to tests page with the quiz selected
        if (step?.data?.quiz_id) {
          navigate(`/courses/${courseId}/tests`, {
            state: {
              selectedQuizId: step.data.quiz_id,
              scrollToQuiz: true,
              returnTo: `/courses/${courseId}/study-planner`
            }
          });
        } else {
          navigate(`/courses/${courseId}/tests`);
        }
        break;
        
      case 'video':
        // Navigate to videos page with the video selected
        navigate(`/courses/${courseId}/videos`, {
          state: {
            selectedLessonId: lesson.id,
            selectedStepIndex: event.stepIndex,
            returnTo: `/courses/${courseId}/study-planner`
          }
        });
        break;
        
      case 'pdf':
        // Navigate to support material page
        navigate(`/courses/${courseId}/material`, {
          state: {
            selectedLessonId: lesson.id,
            selectedStepIndex: event.stepIndex,
            returnTo: `/courses/${courseId}/study-planner`
          }
        });
        break;
        
      default:
        // For default/text lessons, show the modal with details
        setSelectedLesson(lesson);
        break;
    }
  }, [courseId, navigate]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedLesson(null);
  }, []);

  // Handle note selection from calendar
  const handleSelectNote = useCallback((note) => {
    setSelectedNote(note);
  }, []);

  // Close note detail modal
  const handleCloseNoteModal = useCallback(() => {
    setSelectedNote(null);
  }, []);

  // Open create note modal
  const handleOpenCreateNote = useCallback(() => {
    setEditingNote(null);
    setShowNoteModal(true);
  }, []);

  // Open edit note modal
  const handleEditNote = useCallback(() => {
    setEditingNote(selectedNote);
    setSelectedNote(null);
    setShowNoteModal(true);
  }, [selectedNote]);

  // Save note (create or update)
  const handleSaveNote = useCallback(async (noteData) => {
    try {
      if (editingNote) {
        // Update existing note
        const updated = await updateCalendarNote(courseId, editingNote.id, noteData);
        setCalendarNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n));
      } else {
        // Create new note
        const created = await createCalendarNote(courseId, noteData);
        setCalendarNotes(prev => [...prev, created]);
        createNotification({
          course_id: parseInt(courseId),
          notification_type: 'study_plan_note',
          title: t('studyPlanner.noteNotificationTitle', 'Nueva nota en el planificador'),
          message: noteData.title,
          related_object_id: created.id,
          related_object_type: 'calendar_note',
        }).catch(() => {}); // fire-and-forget, don't block the UI
      }
      setShowNoteModal(false);
      setEditingNote(null);
    } catch (err) {
      console.error('Error saving note:', err);
      alert(err.message || t('common.errorSaving', 'Error al guardar'));
    }
  }, [editingNote, courseId, t]);

  // Delete note
  const handleDeleteNote = useCallback(async () => {
    if (!editingNote) return;
    if (!confirm(t('calendar.confirmDeleteNote', '¿Eliminar esta nota?'))) return;
    
    try {
      await deleteCalendarNote(courseId, editingNote.id);
      setCalendarNotes(prev => prev.filter(n => n.id !== editingNote.id));
      setShowNoteModal(false);
      setShowLiveClassModal(false);
      setEditingNote(null);
    } catch (err) {
      console.error('Error deleting note:', err);
      alert(err.message || t('common.errorDeleting', 'Error al eliminar'));
    }
  }, [editingNote, courseId, t]);

  // Open create live class modal
  const handleOpenCreateLiveClass = useCallback(() => {
    setEditingNote(null);
    setShowLiveClassModal(true);
  }, []);

  // Open edit live class/note modal (determines which modal based on type)
  const handleEditNoteOrLiveClass = useCallback(() => {
    if (selectedNote?.type === 'live_class') {
      setEditingNote(selectedNote);
      setSelectedNote(null);
      setShowLiveClassModal(true);
    } else {
      setEditingNote(selectedNote);
      setSelectedNote(null);
      setShowNoteModal(true);
    }
  }, [selectedNote]);

  // Save live class (create or update)
  const handleSaveLiveClass = useCallback(async (liveClassData) => {
    try {
      if (editingNote) {
        // Update existing live class
        const updated = await updateCalendarNote(courseId, editingNote.id, liveClassData);
        setCalendarNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n));
      } else {
        // Create new live class
        const created = await createCalendarNote(courseId, liveClassData);
        setCalendarNotes(prev => [...prev, created]);
        createNotification({
          course_id: parseInt(courseId),
          notification_type: 'study_plan_live_class',
          title: t('studyPlanner.liveClassNotificationTitle', 'Nueva clase en directo'),
          message: liveClassData.title,
          related_object_id: created.id,
          related_object_type: 'calendar_note',
        }).catch(() => {}); // fire-and-forget, don't block the UI
      }
      setShowLiveClassModal(false);
      setEditingNote(null);
    } catch (err) {
      console.error('Error saving live class:', err);
      alert(err.message || t('common.errorSaving', 'Error al guardar'));
    }
  }, [editingNote, courseId, t]);

  return (
    <div className="flex h-full w-full">
      <CourseSidebar />
      <div 
        className="flex-1 flex flex-col overflow-auto"
        style={{ backgroundColor: getColor('secondaryBackground', '#f3f4f6') }}
      >
        {/* Breadcrumbs Header */}
        <header 
          className="px-6 py-3 border-b sticky top-0 z-[1] flex-shrink-0" 
          style={{ 
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${getColor('primary', '#1a202c')}15`,
            backgroundColor: getColor('secondaryBackground', '#f3f4f6')
          }}
        >
          <nav className="flex items-center text-sm space-x-2">
            <Link 
              to="/courses"
              className="transition-colors duration-200 hover:underline font-medium"
              style={{ color: pageColors.text }}
            >
              {t('sidebar.courses', 'Cursos')}
            </Link>
            <ChevronRight size={16} style={{ color: pageColors.textMuted }} />
            <span 
              className="font-medium"
              style={{ color: pageColors.text }}
            >
              {t('courses.studyPlanner', 'Planificador')}
            </span>
          </nav>
        </header>

        {/* Page Content */}
        <div className="max-w-7xl w-full mx-auto px-4 py-6 pb-24">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: pageColors.hoverBg }}
                >
                  <Calendar size={28} style={{ color: pageColors.text }} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: pageColors.text }}>
                    {t('courses.studyPlanner', 'Planificador')}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: pageColors.textMuted }}>
                    {t('calendar.description', 'Visualiza el calendario de lecciones del curso')}
                  </p>
                </div>
              </div>
              {/* Admin: Add buttons */}
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenCreateLiveClass}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{ 
                      backgroundColor: '#EF4444',
                      color: '#fff'
                    }}
                  >
                    <Video size={18} />
                    <span className="hidden sm:inline">{t('calendar.addLiveClass', 'Añadir clase')}</span>
                  </button>
                  <button
                    onClick={handleOpenCreateNote}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                    style={{ 
                      backgroundColor: '#8B5CF6',
                      color: '#fff'
                    }}
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">{t('calendar.addNote', 'Añadir nota')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Color Legend */}
          <div 
            className="mb-6 p-4 rounded-xl border-2"
            style={{ 
              backgroundColor: pageColors.bgCard,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : getColor('borderColor', '#e5e7eb')
            }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: pageColors.text }}>
              {t('calendar.legend', 'Leyenda')}
            </h3>
            <div className="flex flex-wrap gap-4">
              {/* Video */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#EF4444' }}
                />
                <Video size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.text }}>
                  {t('calendar.legendVideo', 'Video')}
                </span>
              </div>
              {/* Test/Quiz */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#3B82F6' }}
                />
                <ClipboardList size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.text }}>
                  {t('calendar.legendTest', 'Test')}
                </span>
              </div>
              {/* PDF */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#10B981' }}
                />
                <Download size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.text }}>
                  {t('calendar.legendPdf', 'PDF')}
                </span>
              </div>
              {/* Note */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: '#8B5CF6' }}
                />
                <StickyNote size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.text }}>
                  {t('calendar.legendNote', 'Nota')}
                </span>
              </div>
              {/* Live Class */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border-2 border-dashed"
                  style={{ borderColor: '#EF4444', backgroundColor: 'transparent' }}
                />
                <Video size={14} style={{ color: pageColors.textMuted }} />
                <span className="text-sm" style={{ color: pageColors.text }}>
                  {t('calendar.legendLiveClass', 'Clase en directo')}
                </span>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin" style={{ color: pageColors.text }} />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div 
              className="p-6 rounded-lg border-2"
              style={{
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                borderColor: '#ef4444',
                color: '#ef4444'
              }}
            >
              {error.message}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && lessons.length === 0 && (
            <div 
              className="p-12 text-center rounded-xl border-2"
              style={{
                backgroundColor: pageColors.bgCard,
                borderColor: getColor('borderColor', '#e5e7eb')
              }}
            >
              <Calendar size={64} className="mx-auto mb-4" style={{ color: pageColors.textMuted }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: pageColors.text }}>
                {t('calendar.noLessons', 'No hay lecciones')}
              </h3>
              <p style={{ color: pageColors.textMuted }}>
                {t('calendar.noLessonsDescription', 'Este curso aún no tiene lecciones programadas.')}
              </p>
            </div>
          )}

          {/* Calendar */}
          {!loading && !error && lessons.length > 0 && (
            <LessonCalendar
              lessons={lessons}
              onSelectLesson={handleNavigateToContent}
              defaultView="week"
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
              calendarNotes={calendarNotes}
              onSelectNote={handleSelectNote}
              isAdmin={isAdmin}
            />
          )}

          {/* Lesson detail modal */}
          {selectedLesson && (
            <LessonDetailModal
              lesson={selectedLesson}
              onClose={handleCloseModal}
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Note detail modal */}
          {selectedNote && (
            <NoteDetailModal
              note={selectedNote}
              onClose={handleCloseNoteModal}
              onEdit={isAdmin ? handleEditNoteOrLiveClass : null}
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
              t={t}
              isAdmin={isAdmin}
            />
          )}

          {/* Note create/edit modal (admin only) */}
          {showNoteModal && isAdmin && (
            <NoteModal
              note={editingNote}
              onSave={handleSaveNote}
              onDelete={editingNote ? handleDeleteNote : null}
              onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
              t={t}
              isEditing={!!editingNote}
            />
          )}

          {/* Live class create/edit modal (admin only) */}
          {showLiveClassModal && isAdmin && (
            <LiveClassModal
              liveClass={editingNote}
              onSave={handleSaveLiveClass}
              onDelete={editingNote ? handleDeleteNote : null}
              onClose={() => { setShowLiveClassModal(false); setEditingNote(null); }}
              pageColors={pageColors}
              getColor={getColor}
              isDarkMode={isDarkMode}
              t={t}
              isEditing={!!editingNote}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlannerPage;
