/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Solution } from "../../types";
import { Plus, Trash2, Edit, Save, X, Lightbulb, CheckCircle, Zap } from "lucide-react";

export default function SolutionsAdmin() {
  const { solutions, addSolution, updateSolution, deleteSolution, showToast } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for adding/editing solutions
  const [formData, setFormData] = useState<Omit<Solution, "id">>({
    title: "",
    description: "",
    badge: "",
    iconName: "Zap",
    image: "",
    details: [""]
  });

  const [isAdding, setIsAdding] = useState(false);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      badge: "",
      iconName: "Zap",
      image: "",
      details: [""]
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleStartEdit = (sol: Solution) => {
    setEditingId(sol.id);
    setFormData({
      title: sol.title,
      description: sol.description,
      badge: sol.badge,
      iconName: sol.iconName || "Zap",
      image: sol.image,
      details: sol.details.length > 0 ? [...sol.details] : [""]
    });
    setIsAdding(false);
  };

  const handleDetailChange = (index: number, value: string) => {
    const updatedDetails = [...formData.details];
    updatedDetails[index] = value;
    setFormData(prev => ({ ...prev, details: updatedDetails }));
  };

  const handleAddDetailField = () => {
    setFormData(prev => ({ ...prev, details: [...prev.details, ""] }));
  };

  const handleRemoveDetailField = (index: number) => {
    if (formData.details.length <= 1) return;
    const updatedDetails = formData.details.filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, details: updatedDetails }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      showToast("Vui lòng điền tiêu đề và mô tả ngắn!", "warning");
      return;
    }

    const filteredDetails = formData.details.filter(d => d.trim() !== "");

    if (editingId) {
      updateSolution({
        id: editingId,
        ...formData,
        details: filteredDetails
      });
      showToast("Cập nhật thông tin Giải pháp thành công!", "success");
    } else {
      const newId = "sol-" + Date.now();
      addSolution({
        id: newId,
        ...formData,
        details: filteredDetails
      });
      showToast("Thêm giải pháp doanh nghiệp mới thành công!", "success");
    }
    resetForm();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa Giải pháp '${name.toUpperCase()}' khỏi hệ thống?`)) {
      deleteSolution(id);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-white/5 p-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-sm font-display font-black tracking-widest text-gold-light uppercase mb-1">
            DANH SÁCH GIẢI PHÁP DOANH NGHIỆP
          </h2>
          <p className="text-[11px] text-gray-500">
            Cấu hình các giải pháp tạo mẫu, POSM, mô hình và sản xuất in 3D cho website
          </p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-gold-dark text-black text-[11px] font-display font-extrabold tracking-wider uppercase hover:bg-gold-light transition-all flex items-center gap-2 rounded-md self-start"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            THÊM GIẢI PHÁP MỚI
          </button>
        )}
      </div>

      {/* Editor & Creation Form Grid Block */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="mb-10 p-6 bg-black border border-gold-dark/20 space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-4">
            <h3 className="text-xs font-display font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-light" />
              {editingId ? "CẬP NHẬT GIẢI PHÁP" : "THÊM GIẢI PHÁP MỚI"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-display font-bold text-gray-550 uppercase mb-1 block">Tên giải pháp *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ví dụ: TẠO MẪU SẢN PHẨM NHANH"
                className="w-full bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-light"
              />
            </div>
            <div>
              <label className="text-[10px] font-display font-bold text-gray-550 uppercase mb-1 block">Badge nhãn dán</label>
              <input
                type="text"
                value={formData.badge}
                onChange={e => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                placeholder="Ví dụ: SOLAR ESS / PHỔ BIẾN NHẤT"
                className="w-full bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-light"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-display font-bold text-gray-550 uppercase mb-1 block">Tên Icon (Lucide Icon)</label>
              <select
                value={formData.iconName}
                onChange={e => setFormData(prev => ({ ...prev, iconName: e.target.value }))}
                className="w-full bg-[#121212] border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-light"
              >
                <option value="Zap">Zap (Tia chớp)</option>
                <option value="Battery">Battery (Pin cục)</option>
                <option value="Globe">Globe (Toàn cầu)</option>
                <option value="Shield">Shield (Lá chắn)</option>
                <option value="Sliders">Sliders (Bảng mạch)</option>
                <option value="Wrench">Wrench (Công cụ)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-display font-bold text-gray-550 uppercase mb-1 block">Hình ảnh chính sản phẩm (URL)</label>
              <input
                type="text"
                value={formData.image}
                onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                placeholder="Ví dụ: https://images.unsplash.com/photo-..."
                className="w-full bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-light"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-display font-bold text-gray-550 uppercase mb-1 block">Mô tả tóm tắt ngắn *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Nhập mô tả tóm lược cốt lõi của giải pháp sạc điện này..."
              className="w-full bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-light"
            />
          </div>

          {/* Expanded Details specs block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-display font-bold text-gray-550 uppercase">Đặc điểm / Tính năng chi tiết giải pháp</label>
              <button
                type="button"
                onClick={handleAddDetailField}
                className="text-[9.5px] font-mono text-gold-light hover:underline"
              >
                + THÊM DÒNG CHI TIẾT
              </button>
            </div>

            <div className="space-y-2">
              {formData.details.map((detail, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={detail}
                    onChange={e => handleDetailChange(idx, e.target.value)}
                    placeholder={`Ví dụ: Tăng tuổi thọ xả kiệt sụt áp gấp 5 lần so với ắc quy thông thường`}
                    className="flex-1 bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-light"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDetailField(idx)}
                    disabled={formData.details.length <= 1}
                    className="px-2.5 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-550/20 text-xs disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-white/10 text-gray-400 text-[11px] font-display font-bold hover:text-white hover:border-white/20 transition-all rounded-md"
            >
              HỦY THAO TÁC
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gold-dark text-black text-[11px] font-display font-black tracking-wider uppercase hover:bg-gold-light transition-all rounded-md flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              LƯU HOÀN THÀNH
            </button>
          </div>
        </form>
      )}

      {/* Grid listing of Solutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {solutions.map((sol) => (
          <div
            key={sol.id}
            className="bg-black/40 border border-white/5 p-4 flex flex-col justify-between hover:border-gold-dark/20 transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gold-dark/10 border border-gold-dark/20 text-gold-light">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-mono font-bold text-gold-dark uppercase tracking-wider">{sol.badge || "SOLUTION"}</span>
                    <h3 className="text-xs font-display font-black text-white uppercase tracking-wide group-hover:text-gold-light transition-colors">{sol.title}</h3>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleStartEdit(sol)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                    title="Chỉnh sửa giải pháp"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(sol.id, sol.title)}
                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-all border border-[#EF4444]/10"
                    title="Xóa giải pháp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed mb-4 line-clamp-2">
                {sol.description}
              </p>

              {/* Specs bullet count helper */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-semibold">ƯU ĐIỂM CHỦ CHỐT ({sol.details.length}):</span>
                <ul className="w-full space-y-1">
                  {sol.details.slice(0, 2).map((det, index) => (
                    <li key={index} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="truncate">{det}</span>
                    </li>
                  ))}
                  {sol.details.length > 2 && (
                    <li className="text-[9.5px] text-gold-dark italic pl-4">
                      + và {sol.details.length - 2} đặc điểm sụt áp tuyệt vời khác...
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {sol.image && (
              <div className="mt-4 aspect-video border border-white/5 bg-neutral-950 overflow-hidden relative">
                <img
                  src={sol.image}
                  alt={sol.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover grayscale brightness-75 group-hover:scale-105 transition-transform duration-350"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
