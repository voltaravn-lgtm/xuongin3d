"use client";

import React, { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  User,
} from "firebase/auth";
import { KeyRound, Lock, LogIn, Mail, ShieldCheck, X } from "lucide-react";
import { auth } from "../lib/firebase";
import { isAdminEmail } from "../lib/adminAuth";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });
  }, []);

  const isAllowed = Boolean(user?.emailVerified && isAdminEmail(user.email));
  const hasPasswordProvider = Boolean(user?.providerData.some((provider) => provider.providerId === "password"));

  const saveAdminPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage("");

    if (!user?.email || !isAdminEmail(user.email)) {
      setPasswordMessage("Phiên đăng nhập quản trị không hợp lệ.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage("Mật khẩu cần có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Hai lần nhập mật khẩu chưa trùng nhau.");
      return;
    }

    const applyPassword = async () => {
      if (hasPasswordProvider) {
        await updatePassword(user, newPassword);
        return user;
      }

      const credential = EmailAuthProvider.credential(user.email!, newPassword);
      const result = await linkWithCredential(user, credential);
      return result.user;
    };

    setPasswordSaving(true);
    try {
      let updatedUser: User;
      try {
        updatedUser = await applyPassword();
      } catch (error: any) {
        if (error?.code !== "auth/requires-recent-login") throw error;

        const canReauthenticateWithGoogle = user.providerData.some((provider) => provider.providerId === "google.com");
        if (!canReauthenticateWithGoogle) throw error;
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
        updatedUser = await applyPassword();
      }

      setUser(updatedUser);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(
        hasPasswordProvider
          ? "Đã cập nhật mật khẩu Admin thành công."
          : "Đã thiết lập mật khẩu Admin. Từ lần sau có thể đăng nhập bằng Google hoặc Email/Mật khẩu."
      );
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/weak-password") {
        setPasswordMessage("Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự và kết hợp chữ, số.");
      } else if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
        setPasswordMessage("Email này đã thuộc một tài khoản Firebase khác. Không thể tự động liên kết mật khẩu.");
      } else if (code === "auth/popup-closed-by-user") {
        setPasswordMessage("Bạn đã đóng cửa sổ xác nhận Google trước khi hoàn tất.");
      } else if (code === "auth/requires-recent-login") {
        setPasswordMessage("Firebase yêu cầu đăng nhập lại. Hãy đăng xuất, đăng nhập Google lại rồi thử ngay.");
      } else {
        setPasswordMessage("Không thể thiết lập mật khẩu. Vui lòng thử lại hoặc kiểm tra Email/Password trong Firebase Authentication.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await reload(result.user);
      await result.user.getIdToken(true);

      if (!isAdminEmail(result.user.email)) {
        await signOut(auth);
        setError("Email này không có quyền truy cập quản trị Xưởng In 3D.");
      } else if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
        await signOut(auth);
        setError("Email quản trị chưa được xác minh. Xưởng đã gửi liên kết xác minh vào hộp thư; hãy xác minh rồi đăng nhập lại, hoặc dùng Google.");
      }
    } catch (error: any) {
      const code = error?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Email hoặc mật khẩu Admin chưa chính xác.");
      } else if (code === "auth/too-many-requests") {
        setError("Tài khoản tạm khóa do thử đăng nhập nhiều lần. Vui lòng chờ một lúc hoặc dùng Quên mật khẩu.");
      } else if (code === "auth/user-disabled") {
        setError("Tài khoản này đã bị vô hiệu hóa trong Firebase Authentication.");
      } else if (code === "auth/network-request-failed") {
        setError("Không kết nối được Firebase. Vui lòng kiểm tra mạng rồi thử lại.");
      } else {
        setError(`Không đăng nhập được${code ? ` (${code})` : ""}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (!isAdminEmail(result.user.email)) {
        await signOut(auth);
        setError("Tài khoản Google này không có quyền truy cập quản trị Xưởng In 3D.");
      }
    } catch {
      setError("Không đăng nhập được bằng Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Nhập email admin trước khi yêu cầu đặt lại mật khẩu.");
      return;
    }

    if (!isAdminEmail(email.trim())) {
      setError("Email này không nằm trong danh sách quản trị.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư của bạn.");
    } catch {
      setError("Không gửi được email đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <div className="text-gold-light animate-pulse text-sm font-display tracking-widest uppercase">
          Đang kiểm tra quyền quản trị...
        </div>
      </div>
    );
  }

  if (user && isAllowed) {
    return (
      <div>
        <div className="sticky top-0 z-40 bg-black/90 border-b border-gold-dark/20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <ShieldCheck className="w-4 h-4 text-gold-light" />
              <span className="font-mono">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordMessage("");
                  setIsPasswordPanelOpen(true);
                }}
                className="flex items-center gap-2 border border-gold-dark/35 px-4 py-2 text-[11px] font-display font-bold uppercase tracking-wider text-gold-light transition-colors hover:border-gold-light"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {hasPasswordProvider ? "Đổi mật khẩu" : "Thiết lập mật khẩu"}
              </button>
              <button
                onClick={() => signOut(auth)}
                className="px-4 py-2 text-[11px] font-display font-bold uppercase tracking-widest border border-white/10 text-gray-300 hover:text-white hover:border-gold-dark transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
        {children}

        {isPasswordPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <form
              onSubmit={saveAdminPassword}
              className="w-full max-w-md border border-gold-dark/30 bg-[#0b0b0b] shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-white/10 p-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[.22em] text-gold-light">Bảo mật Admin</p>
                  <h2 className="mt-1 text-xl font-black uppercase text-white">
                    {hasPasswordProvider ? "Đổi mật khẩu" : "Thiết lập mật khẩu"}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPasswordPanelOpen(false)}
                  className="p-2 text-gray-500 hover:text-white"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                {!hasPasswordProvider && (
                  <p className="border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs leading-5 text-blue-200">
                    Mật khẩu này chỉ dùng để đăng nhập Admin bằng Email/Mật khẩu và không thay đổi mật khẩu Google.
                  </p>
                )}
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mật khẩu mới</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold-light"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nhập lại mật khẩu</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold-light"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </label>

                {passwordMessage && (
                  <div className="border border-gold-dark/25 bg-gold-dark/10 px-4 py-3 text-xs leading-5 text-gold-light">
                    {passwordMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex w-full items-center justify-center gap-2 bg-gold-light px-4 py-3 text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {passwordSaving ? "Đang cập nhật..." : hasPasswordProvider ? "Cập nhật mật khẩu" : "Tạo mật khẩu Admin"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#ECECEC] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md border border-gold-dark/25 bg-[#0B0B0B] shadow-[0_0_50px_rgba(218,154,43,0.08)]">
        <div className="p-6 border-b border-white/5">
          <div className="w-12 h-12 border border-gold-dark/40 bg-gold-dark/10 flex items-center justify-center mb-5">
            <Lock className="w-6 h-6 text-gold-light" />
          </div>
          <p className="text-[10px] font-mono text-gold-dark tracking-[0.25em] uppercase mb-2">
            Xưởng In 3D Admin
          </p>
          <h1 className="text-2xl font-display font-black tracking-wider text-white">
            Đăng nhập quản trị
          </h1>
        </div>

        <form onSubmit={handleEmailLogin} className="p-6 space-y-4" autoComplete="off">
          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-light"
              placeholder="Nhập email quản trị"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-black border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-light"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="border border-gold-dark/30 bg-gold-dark/10 px-4 py-3 text-xs text-gold-light leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gold-light text-black px-4 py-3 text-xs font-display font-black uppercase tracking-widest disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 border border-white/10 text-white px-4 py-3 text-xs font-display font-bold uppercase tracking-widest hover:border-gold-dark disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            Đăng nhập bằng Google
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full text-center text-xs text-gray-400 hover:text-gold-light transition-colors"
          >
            Quên mật khẩu
          </button>
        </form>
      </div>
    </div>
  );
}
