import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Article } from "../../types";
import { Plus, Trash2, Edit, Copy, Save, X, Eye, FileText, Calendar, BookOpen, Layers } from "lucide-react";

export default function KnowledgeAdmin() {
  const { articles, addArticle, updateArticle, deleteArticle, showToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form State
  const [form, setForm] = useState({
    id: "",
    title: "",
    brief: "",
    content: "",
    category: "Hướng dẫn",
    image: "/images/kien-thuc.webp",
    readTime: "5 phút đọc"
  });

  const categories = [
    "Vật liệu in 3D",
    "Hướng dẫn",
    "Công nghệ in 3D",
    "Ứng dụng in 3D",
    "Tin tức & sự kiện"
  ];

  const handleOpenAdd = () => {
    setEditingArticle(null);
    setForm({
      id: "art-" + Date.now().toString().slice(-6),
      title: "",
      brief: "",
      content: "",
      category: "Hướng dẫn",
      image: "/images/kien-thuc.webp",
      readTime: "5 phút đọc"
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (art: Article) => {
    setEditingArticle(art);
    setForm({
      id: art.id,
      title: art.title,
      brief: art.brief,
      content: art.content,
      category: art.category,
      image: art.image,
      readTime: art.readTime || "5 phút đọc"
    });
    setIsModalOpen(true);
  };

  const handleCopy = (art: Article) => {
    const copyId = `art-copy-${Date.now().toString().slice(-4)}`;
    const copiedArt: Article = {
      ...art,
      id: copyId,
      title: `${art.title} (Bản sao)`,
      date: new Date().toLocaleDateString("vi-VN"),
      views: 0
    };
    addArticle(copiedArt);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.title) {
      showToast("Vui lòng điền mã ID và Tiêu đề!", "warning");
      return;
    }

    const payload: Article = {
      id: form.id,
      title: form.title,
      brief: form.brief,
      content: form.content,
      category: form.category,
      image: form.image,
      readTime: form.readTime,
      date: editingArticle ? editingArticle.date : new Date().toLocaleDateString("vi-VN"),
      views: editingArticle ? editingArticle.views : 0,
      featured: editingArticle?.featured || false,
    };

    if (editingArticle) {
      const saved = await updateArticle(payload);
      if (!saved) return;
      showToast("Đã cập nhật bài viết thành công!", "success");
    } else {
      const saved = await addArticle(payload);
      if (!saved) return;
      showToast("Đã tạo bài viết mới thành công!", "success");
    }
    setIsModalOpen(false);
  };

  // Helper formatting insert
  const insertText = (tag: string) => {
    const contentTextarea = document.getElementById("article-content-textarea") as HTMLTextAreaElement;
    if (!contentTextarea) return;

    const start = contentTextarea.selectionStart;
    const end = contentTextarea.selectionEnd;
    const text = contentTextarea.value;
    const selected = text.substring(start, end);

    let replacement = "";
    if (tag === "bold") replacement = `**${selected}**`;
    else if (tag === "italic") replacement = `*${selected}*`;
    else if (tag === "heading") replacement = `\n### ${selected || "Tiêu đề phụ"}\n`;
    else if (tag === "bullet") replacement = `\n- ${selected || "Mục liệt kê"}\n`;
    else if (tag === "link") replacement = `[${selected || "Tên liên kết"}](https://vietnamese-url.com)`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setForm({ ...form, content: newContent });

    // Focus back
    setTimeout(() => {
      contentTextarea.focus();
      contentTextarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-semibold tracking-wide text-white uppercase flex items-center gap-2 text-gold-light">
            <FileText className="w-5 h-5" />
            QUẢN TRÌ KIẾN THỨC & TIN TỨC ({articles.length})
          </h2>
          <p className="text-xs text-gray-400">Thiết lập bài viết về vật liệu, công nghệ in 3D, chuẩn bị file và hướng dẫn sử dụng sản phẩm.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="gold-gradient-bg hover:opacity-90 text-black px-4 py-2 text-xs font-display font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Thêm Bài Viết
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((art) => (
          <div key={art.id} className="bg-black border border-white/5 p-4 flex gap-4 hover:border-gold-dark/30 transition-all">
            <img
              src={art.image}
              alt={art.title}
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-cover shrink-0 border border-white/10 bg-neutral-900"
            />
            <div className="flex-1 space-y-1 min-w-0 text-left">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gold-light bg-gold-dark/10 px-2 py-0.5 border border-gold-dark/20 inline-block">
                {art.category}
              </span>
              <h4 className="text-xs font-display font-bold text-white truncate max-w-full" title={art.title}>
                {art.title}
              </h4>
              <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                {art.brief}
              </p>
              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono pt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {art.date}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {art.readTime || "5 phút"}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {art.views} views</span>
              </div>
              
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                <button
                  onClick={() => handleOpenEdit(art)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-display font-semibold uppercase text-gold-light bg-gold-dark/5 border border-gold-dark/15 hover:bg-gold-light hover:text-black hover:border-transparent transition-all cursor-pointer"
                >
                  <Edit className="w-3 h-3" /> Sửa
                </button>
                <button
                  onClick={() => handleCopy(art)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-display font-semibold uppercase text-blue-400 bg-blue-500/5 border border-blue-500/15 hover:bg-blue-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
                  title="Sao chép bài viết này"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Xóa bài viết: "${art.title}"?`)) {
                      deleteArticle(art.id);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-display font-semibold uppercase text-red-400 bg-red-500/5 border border-red-500/15 hover:bg-red-500 hover:text-white hover:border-transparent transition-all cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3 h-3" /> Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0D0D] border border-gold-dark/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-display font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-light" />
              {editingArticle ? "CẬP NHẬT BÀI VIẾT" : "THÊM BÀI VIẾT MỚI"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Mã ID bài viết (Slug URL) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingArticle}
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full bg-black text-white border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-gold-light disabled:opacity-40"
                    placeholder="vi-du-kien-thuc-in-3d"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Danh mục bài viết *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-black text-white border border-white/10 h-[34px] px-3 text-xs focus:outline-none focus:border-gold-light rounded-md"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Tiêu đề bài viết *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-black text-white border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-gold-light"
                  placeholder="Nhập tiêu đề hấp dẫn..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Thời gian đọc</label>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                    className="w-full bg-black text-white border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-gold-light"
                    placeholder="Ví dụ: 6 phút đọc"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Hình ảnh bài viết (Link URL)</label>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="w-full bg-[#050505] text-white border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-gold-light font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Tóm tắt ngắn (Brief)</label>
                <textarea
                  rows={2}
                  value={form.brief}
                  onChange={(e) => setForm({ ...form, brief: e.target.value })}
                  className="w-full bg-black text-white border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-gold-light"
                  placeholder="Tóm tắt ngắn gọn hiển thị ngoài danh sách..."
                />
              </div>

              {/* Description styling utilities */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-display uppercase tracking-wider text-gray-500 block font-bold">Chi tiết bài viết *</label>
                  <div className="flex gap-1.5 bg-black border border-white/5 p-1">
                    <button type="button" onClick={() => insertText("bold")} className="px-2 py-0.5 text-[9px] font-display font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 border border-white/5" title="Chữ in đậm">B</button>
                    <button type="button" onClick={() => insertText("italic")} className="px-2 py-0.5 text-[9px] font-display font-bold uppercase italic text-gray-400 hover:text-white hover:bg-white/5 border border-white/5" title="Chữ in nghiêng">I</button>
                    <button type="button" onClick={() => insertText("heading")} className="px-2 py-0.5 text-[9px] font-display font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 border border-white/5" title="Tiêu đề phụ">H3</button>
                    <button type="button" onClick={() => insertText("bullet")} className="px-2 py-0.5 text-[9px] font-display font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 border border-white/5" title="Danh sách liệt kê">List</button>
                    <button type="button" onClick={() => insertText("link")} className="px-2 py-0.5 text-[9px] font-display font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 border border-white/5" title="Thêm đường dẫn liên kết">URL</button>
                  </div>
                </div>
                <textarea
                  id="article-content-textarea"
                  rows={8}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-black text-white border border-white/10 p-3 text-xs focus:outline-none focus:border-gold-light font-sans leading-relaxed"
                  placeholder="Nội dung bài viết chi tiết..."
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-white/10 text-xs text-gray-400 font-display font-bold uppercase tracking-widest hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="gold-gradient-bg text-black font-display font-bold px-6 py-2 text-xs uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
