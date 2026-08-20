import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Film,
  FileText,
  Video,
  Plus,
  Search,
  Star,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  UploadCloud,
  X,
  ExternalLink,
  BookMarked,
  Sparkles,
} from 'lucide-react';
import {
  LibraryItem,
  MediaItemType,
  MediaItemStatus,
  ColorPalette,
  ThemeMode,
} from '../types';
import { COLOR_PALETTES } from '../lib/theme';
import { SupabaseSyncService } from '../lib/supabaseSync';

interface LibraryViewProps {
  items: LibraryItem[];
  onAddItem: (item: Omit<LibraryItem, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateItem: (id: string, updates: Partial<LibraryItem>) => void;
  onDeleteItem: (id: string) => void;
  colorPalette: ColorPalette;
  themeMode: ThemeMode;
  userId: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  colorPalette,
  themeMode,
  userId,
}) => {
  const isDark = themeMode === 'dark';
  const pal = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.purple;

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | MediaItemType>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | MediaItemStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isModalOpen]);

  // Form State inside Modal
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<MediaItemType>('book');
  const [status, setStatus] = useState<MediaItemStatus>('reading');
  const [progress, setProgress] = useState(0);
  const [totalUnits, setTotalUnits] = useState(100);
  const [unitLabel, setUnitLabel] = useState('páginas');
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setAuthor('');
    setType('book');
    setStatus('reading');
    setProgress(0);
    setTotalUnits(300);
    setUnitLabel('páginas');
    setRating(5);
    setNotes('');
    setCoverUrl('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80');
    setTags(['Estudo', 'Leitura']);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LibraryItem) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setAuthor(item.author || '');
    setType(item.type || 'book');
    setStatus(item.status || 'reading');
    setProgress(item.progress ?? 0);
    setTotalUnits(item.totalUnits ?? 100);
    setUnitLabel(item.unitLabel || 'páginas');
    setRating(item.rating ?? 5);
    setNotes(item.notes || '');
    setCoverUrl(item.coverUrl || '');
    setTags(item.tags || []);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (!base64) return;
      // Show it immediately, then swap for the Supabase Storage URL once it
      // uploads (falls back to the base64 itself if the upload fails).
      setCoverUrl(base64);
      const finalUrl = await SupabaseSyncService.uploadTaskImage(userId, base64);
      if (finalUrl && finalUrl !== base64) {
        setCoverUrl(finalUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingItem) {
      onUpdateItem(editingItem.id, {
        title: title.trim(),
        author: author.trim(),
        type,
        status,
        progress: Number(progress),
        totalUnits: Number(totalUnits),
        unitLabel,
        rating,
        notes: notes.trim(),
        coverUrl,
        tags,
      });
    } else {
      onAddItem({
        title: title.trim(),
        author: author.trim(),
        type,
        status,
        progress: Number(progress),
        totalUnits: Number(totalUnits),
        unitLabel,
        rating,
        notes: notes.trim(),
        coverUrl,
        tags,
        dateStarted: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const getTypeIcon = (t: MediaItemType) => {
    switch (t) {
      case 'book':
        return <BookOpen className="w-4 h-4" />;
      case 'documentary':
        return <Film className="w-4 h-4" />;
      case 'article':
        return <FileText className="w-4 h-4" />;
      case 'course':
        return <Video className="w-4 h-4" />;
      default:
        return <BookMarked className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (st: MediaItemStatus) => {
    switch (st) {
      case 'reading':
        return { label: 'Em Andamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'completed':
        return { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'want_to_read':
        return { label: 'Quero Ler/Ver', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'paused':
        return { label: 'Pausado', color: 'bg-zinc-700/40 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div id="library-view-container" className="space-y-6">
      {/* Top Header Banner */}
      <div
        className={`rounded-3xl border p-6 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5 transition-all ${
          isDark
            ? 'bg-[#1E293B] border-slate-700/60'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
        style={isDark ? { borderColor: `${pal.previewColor}40` } : {}}
      >
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <div
              className="p-2 sm:p-2.5 rounded-2xl text-white shadow-md font-bold shrink-0"
              style={{ backgroundColor: pal.previewColor }}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className={`text-base sm:text-lg md:text-xl font-extrabold tracking-tight whitespace-nowrap truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Biblioteca & Acervo de Estudos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Armazene livros, documentários, artigos científicos e cursos com notas pessoais e acompanhamento de progresso.
          </p>
        </div>

        <button
          id="add-media-item-btn"
          onClick={openCreateModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] cursor-pointer shrink-0"
          style={{ backgroundColor: pal.previewColor }}
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Obra / Artigo</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'book', label: 'Livros' },
            { id: 'documentary', label: 'Documentários' },
            { id: 'article', label: 'Artigos' },
            { id: 'course', label: 'Cursos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTypeFilter === tab.id
                  ? 'text-white shadow-md'
                  : isDark
                  ? 'bg-[#1E293B] border border-slate-700/60 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              style={selectedTypeFilter === tab.id ? { backgroundColor: pal.previewColor } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, autor..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-hidden ${
              isDark
                ? 'bg-[#1E293B] border-slate-700/60 text-slate-100 placeholder-slate-500 focus:border-purple-500'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Library Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-slate-700/60 bg-slate-900/30">
          <BookMarked className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-base text-slate-300">Nenhum item encontrado no acervo.</p>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            Adicione leituras acadêmicas, livros clássicos ou documentários para vincular aos seus estudos!
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
            style={{ backgroundColor: pal.previewColor }}
          >
            + Adicionar Primeiro Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const statusInfo = getStatusBadge(item.status);
            const progressPercent =
              item.totalUnits && item.totalUnits > 0
                ? Math.min(100, Math.round((item.progress / item.totalUnits) * 100))
                : 0;

            return (
              <div
                key={item.id}
                className={`group rounded-3xl border p-5 transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${
                  isDark
                    ? 'bg-[#1E293B] border-slate-700/60 hover:border-purple-500/40'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Cover & Metadata */}
                  <div className="flex gap-4 mb-4">
                    {item.coverUrl ? (
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-20 h-28 object-cover rounded-2xl shadow-md shrink-0 ring-1 ring-slate-700/50"
                      />
                    ) : (
                      <div className="w-20 h-28 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 capitalize">
                            {item.type}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm leading-tight text-slate-100 group-hover:text-purple-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.author}</p>
                      </div>

                      {/* Stars Rating */}
                      <div className="flex items-center gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < item.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 my-3 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-700/60">
                    <div className="flex justify-between text-[11px] font-medium text-slate-400">
                      <span>Progresso:</span>
                      <span className="font-bold text-slate-200">
                        {item.progress} / {item.totalUnits} {item.unitLabel || 'páginas'} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: pal.previewColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Personal Notes / Summary preview */}
                  {item.notes && (
                    <div className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-700/40 text-xs text-slate-300 line-clamp-3 whitespace-pre-line leading-relaxed">
                      {item.notes}
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div
                  className="pt-3 border-t mt-4 flex items-center justify-between text-xs"
                  style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}
                >
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 font-semibold hover:underline cursor-pointer"
                    style={{ color: pal.previewColor }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Anotações</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Deseja remover este item da biblioteca?')) {
                        onDeleteItem(item.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Library Item Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-3 sm:p-4 md:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className={`relative w-full max-w-xl rounded-3xl border p-5 sm:p-7 shadow-2xl my-3 sm:my-8 transition-all ${
              isDark ? 'bg-[#0F172A] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b mb-5" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: pal.previewColor }} />
                <h2 className="font-bold text-base">
                  {editingItem ? 'Editar Obra na Biblioteca' : 'Adicionar Nova Obra / Artigo'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Título da Obra / Artigo *</label>
                <input
                  type="text"
                  required
                  value={title || ''}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Hábitos Atômicos, Deep Work, Paper sobre IA..."
                  className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Autor / Produtor</label>
                  <input
                    type="text"
                    value={author || ''}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ex: James Clear, Netflix..."
                    className="w-full px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Tipo de Mídia</label>
                  <select
                    value={type || 'book'}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 focus:outline-hidden"
                  >
                    <option value="book">Livro</option>
                    <option value="documentary">Documentário</option>
                    <option value="article">Artigo / Paper</option>
                    <option value="course">Curso Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Status</label>
                  <select
                    value={status || 'reading'}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 focus:outline-hidden"
                  >
                    <option value="reading">Em Andamento</option>
                    <option value="completed">Concluído</option>
                    <option value="want_to_read">Quero Ler/Ver</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Progresso Atual</label>
                  <input
                    type="number"
                    value={progress ?? 0}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Total (Págs/Min)</label>
                  <input
                    type="number"
                    value={totalUnits ?? 100}
                    onChange={(e) => setTotalUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Avaliação (Estrelas)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setRating(st)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          st <= (rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  Minhas Anotações & Citações Marcantes
                </label>
                <textarea
                  rows={4}
                  value={notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva aqui insights, citações marcantes e resumos dos capítulos..."
                  className="w-full p-3 rounded-2xl border bg-slate-900/80 border-slate-700 text-slate-100 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Capa / Imagem (Upload ou URL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={coverUrl || ''}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Cole a URL da capa ou faça upload..."
                    className="flex-1 px-3 py-2 rounded-xl border bg-slate-900/80 border-slate-700 text-slate-100 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: `${pal.previewColor}20`,
                      color: pal.previewColor,
                      border: `1px solid ${pal.previewColor}40`,
                    }}
                  >
                    Upload
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
                  style={{ backgroundColor: pal.previewColor }}
                >
                  Salvar na Biblioteca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
