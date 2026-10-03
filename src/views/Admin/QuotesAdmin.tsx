import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { QuoteRequest } from "../../types";
import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../../lib/firebase";
import { 
  Search, 
  Trash2, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  User, 
  MapPin, 
  Battery, 
  Mail, 
  Calendar, 
  FileText,
  TrendingUp,
  Sliders,
  ChevronDown,
  X
} from "lucide-react";

export default function QuotesAdmin() {
  const { quoteRequests, setQuoteRequests, updateQuoteRequest, deleteQuoteRequest, showToast } = useApp();

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return onSnapshot(query(collection(db, "quoteRequests"), limit(50)), (snapshot) => {
      setQuoteRequests(snapshot.docs
        .map((item) => item.data() as QuoteRequest)
        .sort((a, b) => String(b.date).localeCompare(String(a.date))));
    }, (error) => console.error("Could not load quote requests:", error));
  }, [setQuoteRequests]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);

  // Stats calculation
  const totalCount = quoteRequests.length;
  const pendingCount = quoteRequests.filter(q => q.status === "Chờ xử lý").length;
  const contactedCount = quoteRequests.filter(q => q.status === "Đã liên hệ").length;
  const completedCount = quoteRequests.filter(q => q.status === "Đã báo giá").length;

  // Filter & Search logic
  const filteredQuotes = quoteRequests.filter(q => {
    const matchesSearch = 
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      q.phone.includes(search) ||
      q.productName.toLowerCase().includes(search.toLowerCase()) ||
      (q.notes && q.notes.toLowerCase().includes(search.toLowerCase())) ||
      (q.province && q.province.toLowerCase().includes(search.toLowerCase())) ||
      (q.address && q.address.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (id: string, newStatus: "Chờ xử lý" | "Đã liên hệ" | "Đã báo giá" | "Hủy") => {
    const quote = quoteRequests.find(q => q.id === id);
    if (quote) {
      updateQuoteRequest({
        ...quote,
        status: newStatus
      });
      showToast(`Đã chuyển trạng thái yêu cầu sang "${newStatus}"`, "success");
      // Update selected modal view too if it's currently open
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote({
          ...quote,
          status: newStatus
        });
      }
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu báo giá này?")) {
      deleteQuoteRequest(id);
      showToast("Đã xóa thông tin yêu cầu báo giá!", "info");
      if (selectedQuote?.id === id) {
        setSelectedQuote(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Chờ xử lý":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
      case "Đã liên hệ":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
      case "Đã báo giá":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "Hủy":
        return "bg-gray-500/10 text-gray-400 border border-gray-500/30";
      default:
        return "bg-white/10 text-white border border-white/20";
    }
  };

  return (
    <div id="quotes-admin-container" className="space-y-6 text-left">
      <div>
        <h2 className="font-display font-black text-lg text-white uppercase tracking-wider">
          QUẢN LÝ YÊU CẦU BÁO GIÁ
        </h2>
        <p className="text-xs text-gray-400">
          Tiếp nhận và quản lý yêu cầu báo giá sản phẩm, thiết kế file và dự án in 3D của khách hàng.
        </p>
      </div>

      {/* Overview Cards System */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STAT 1: TOTAL */}
        <div className="bg-[#0B0B0B] border border-white/5 p-4 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest">Tổng yêu cầu</span>
            <span className="font-display font-black text-xl text-white mt-1 block">{totalCount}</span>
          </div>
          <div className="bg-white/5 p-2.5">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* STAT 2: PENDING */}
        <div className="bg-[#0B0B0B] border border-amber-500/10 p-4 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-amber-500/70 uppercase tracking-widest">Chờ xử lý</span>
            <span className="font-display font-black text-xl text-amber-400 mt-1 block animate-pulse">{pendingCount}</span>
          </div>
          <div className="bg-amber-500/5 p-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* STAT 3: CONTACTED */}
        <div className="bg-[#0B0B0B] border border-blue-500/10 p-4 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-blue-500/70 uppercase tracking-widest">Đã liên hệ</span>
            <span className="font-display font-black text-xl text-blue-400 mt-1 block">{contactedCount}</span>
          </div>
          <div className="bg-blue-500/5 p-2.5">
            <Phone className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        {/* STAT 4: QUOTED */}
        <div className="bg-[#0B0B0B] border border-emerald-500/10 p-4 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono text-emerald-500/70 uppercase tracking-widest">Đã báo giá</span>
            <span className="font-display font-black text-xl text-emerald-400 mt-1 block">{completedCount}</span>
          </div>
          <div className="bg-emerald-500/5 p-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controllers */}
      <div className="bg-[#0A0A0A] border border-white/5 p-4 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, số điện thoại, địa chỉ hoặc nội dung yêu cầu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#121212] border border-white/10 px-3 py-2 pl-10 text-xs text-white focus:outline-none focus:border-gold-dark font-sans"
          />
        </div>

        {/* Filter Status Selector */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#F5C45A]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:w-48 bg-[#121212] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-dark"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="Chờ xử lý">Chờ xử lý (Mới)</option>
            <option value="Đã liên hệ">Đã liên hệ</option>
            <option value="Đã báo giá">Đã báo giá</option>
            <option value="Hủy">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left column: List of requests */}
        <div className="xl:col-span-2 space-y-3">
          {filteredQuotes.length === 0 ? (
            <div className="bg-[#080808] border border-dashed border-white/10 p-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Không tìm thấy yêu cầu báo giá</h4>
              <p className="text-xs text-gray-500 mt-1">Cơ sở dữ liệu hoặc nội dung tìm kiếm bộ lọc của bạn trống rỗng.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              {filteredQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuote(q)}
                  className={`border p-4 transition-all cursor-pointer relative group ${
                    selectedQuote?.id === q.id 
                      ? "bg-gold-dark/5 border-gold-light shadow-[0_0_15px_rgba(216,154,43,0.1)]" 
                      : "bg-[#080808] border-white/5 hover:border-white/15"
                  }`}
                >
                  {/* Glowing gold dot for pending requests */}
                  {q.status === "Chờ xử lý" && (
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-extrabold text-white tracking-wide group-hover:text-gold-light transition-colors">
                        {q.customerName}
                      </span>
                      <span className="text-xs font-mono text-gray-500">|</span>
                      <span className="text-xs font-mono text-gold-dark font-semibold">
                        {q.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 uppercase tracking-wide rounded-md ${getStatusBadgeClass(q.status)}`}>
                        {q.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="text-gray-300 flex items-center gap-1.5">
                      <span className="text-gray-500 font-mono text-[10px] uppercase">Pin:</span>
                      <strong className="text-white font-medium">{q.productName}</strong>
                    </p>
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <span className="text-gray-500 font-mono text-[10px] uppercase">Vùng:</span>
                      <span>{q.province} {q.address && `- ${q.address}`}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{formatDate(q.date)}</span>
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(q.id, e)}
                      className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                      title="Xóa vĩnh viễn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Detailed View and action center */}
        <div className="xl:col-span-1">
          {selectedQuote ? (
            <div className="bg-[#080808] border border-gold-dark/20 p-5 sticky top-4 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-xs text-white uppercase tracking-widest flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-gold-light" />
                  Chi tiết yêu cầu
                </h3>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-1 text-gray-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Update Form */}
              <div className="space-y-2 bg-[#0B0B0B] border border-white/5 p-3">
                <label className="block text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                  Trạng thái xử lý:
                </label>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {(["Chờ xử lý", "Đã liên hệ", "Đã báo giá", "Hủy"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedQuote.id, st)}
                      className={`text-[10px] font-mono py-1.5 transition-all text-center border cursor-pointer ${
                        selectedQuote.status === st
                          ? "bg-gold-light text-black border-gold-light font-bold"
                          : "bg-black border-white/5 text-gray-400 hover:border-white/15"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Info Info List */}
              <div className="space-y-4 text-xs font-sans">
                {/* 1. Client Card name */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-gray-500">Khách hàng đăng ký:</span>
                  <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/5 p-2 border-l-2 border-gold-light">
                    <User className="w-4 h-4 text-gold-light shrink-0" />
                    {selectedQuote.customerName}
                  </div>
                </div>

                {/* 2. Contact Phone */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-gray-500">Số điện thoại liên hệ:</span>
                  <div className="flex items-center justify-between text-gold-light font-mono text-sm bg-white/5 p-2 border-l-2 border-gold-light">
                    <span className="flex items-center gap-2 font-bold select-all">
                      <Phone className="w-4 h-4 shrink-0" />
                      {selectedQuote.phone}
                    </span>
                    <a
                      href={`tel:${selectedQuote.phone}`}
                      className="bg-[#222] hover:bg-gold-light hover:text-black py-0.5 px-2 text-[10px] uppercase font-bold text-white transition-colors"
                    >
                      Gọi ngay
                    </a>
                  </div>
                </div>

                {/* 3. Address */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-gray-500">Khu vực địa lý:</span>
                  <div className="flex items-start gap-2 text-gray-300 bg-white/5 p-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">{selectedQuote.province}</span>
                      <span className="text-gray-400">{selectedQuote.address || "Chi tiết chưa rõ"}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Product wanted */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-gray-500">Sản phẩm kích ứng báo giá:</span>
                  <div className="bg-white/5 p-2 border-l-2 border-[#F5C45A]/70">
                    <p className="font-bold text-white">{selectedQuote.productName}</p>
                    {selectedQuote.batteryType && (
                      <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 bg-white/5 text-gray-400 border border-white/10 uppercase">
                        Mức ứng dụng: {selectedQuote.batteryType}
                      </span>
                    )}
                    {(selectedQuote.voltage || selectedQuote.capacity) && (
                      <div className="flex gap-2 mt-1.5 text-[10px] font-mono text-gray-400">
                        {selectedQuote.voltage && <span>U: <strong className="text-gold-light">{selectedQuote.voltage}</strong></span>}
                        {selectedQuote.capacity && <span>C: <strong className="text-gold-light">{selectedQuote.capacity}</strong></span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Direct Email */}
                {selectedQuote.email && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-500">Địa chỉ email:</span>
                    <div className="flex items-center gap-2 text-gray-300 bg-white/5 p-2">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="select-all">{selectedQuote.email}</span>
                    </div>
                  </div>
                )}

                {/* 6. Technical requirements notes */}
                {selectedQuote.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-500">Lời nhắn / Yêu cầu kỹ thuật chi tiết:</span>
                    <div className="bg-[#121212] border border-white/5 p-3 rounded-md italic text-gray-300 leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all">
                      "{selectedQuote.notes}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#080808] border border-dashed border-white/5 p-8 text-center text-gray-500">
              <Phone className="w-6 h-6 mx-auto text-gray-700 mb-2" />
              <p className="text-xs font-mono uppercase tracking-wider">Xem biểu mẫu chi tiết</p>
              <p className="text-[11px] text-gray-600 mt-1">Chọn một hàng yêu cầu báo giá bên trái để xem đầy đủ lời nhắn, thông số dung lượng sạc xả và tùy biến cập nhật trạng thái liên hệ.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
