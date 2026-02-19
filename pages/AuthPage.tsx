/**
 * 登录/注册页面
 * NOTE: 采用单页切换设计，登录与注册共用同一组件，减少路由跳转
 */
import React, { useState } from 'react';
import { signIn, signUp } from '../services/auth-service';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!email.trim() || !password.trim()) {
            setError('请填写邮箱和密码');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }

        if (!isLogin && password.length < 6) {
            setError('密码长度至少 6 位');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const result = await signIn(email, password);
                if (result.error) {
                    // 转换常见英文错误为中文提示
                    setError(translateAuthError(result.error));
                }
                // 成功后 AuthContext 会自动触发 onAuthStateChange 更新状态
            } else {
                const result = await signUp(email, password);
                if (result.error) {
                    setError(translateAuthError(result.error));
                } else {
                    setSuccessMsg('注册成功！请检查邮箱完成验证后登录。');
                    setIsLogin(true);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * 将 Supabase 返回的英文错误翻译为中文
     */
    const translateAuthError = (msg: string): string => {
        if (msg.includes('Invalid login credentials')) return '邮箱或密码错误';
        if (msg.includes('Email not confirmed')) return '请先验证邮箱后再登录';
        if (msg.includes('User already registered')) return '该邮箱已注册，请直接登录';
        if (msg.includes('Password should be at least')) return '密码至少需要 6 个字符';
        return msg;
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark px-6 relative overflow-hidden">
            {/* 背景装饰光晕 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Logo 区域 */}
            <div className="mb-10 flex flex-col items-center gap-3 relative z-10">
                <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                    <span className="material-symbols-outlined text-background-dark text-3xl">
                        self_improvement
                    </span>
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight text-white">HabitMaster</h1>
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.3em] mt-1">
                        习惯大师
                    </p>
                </div>
            </div>

            {/* 表单卡片 */}
            <div className="w-full max-w-sm relative z-10">
                {/* 切换 Tab */}
                <div className="flex p-1 bg-white/5 rounded-2xl mb-6">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isLogin
                                ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        登录
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!isLogin
                                ? 'bg-primary text-background-dark shadow-lg shadow-primary/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        注册
                    </button>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 邮箱输入 */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">
                            邮箱地址
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                mail
                            </span>
                            <input
                                type="email"
                                id="auth-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                autoComplete="email"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 pl-12 pr-5 text-sm font-medium text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* 密码输入 */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">
                            密码
                        </label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                lock
                            </span>
                            <input
                                type="password"
                                id="auth-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="至少 6 位字符"
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 pl-12 pr-5 text-sm font-medium text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* 确认密码（注册时显示） */}
                    {!isLogin && (
                        <div className="space-y-1.5 animate-in slide-in-from-top duration-300">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">
                                确认密码
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                                    lock_reset
                                </span>
                                <input
                                    type="password"
                                    id="auth-confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="再次输入密码"
                                    autoComplete="new-password"
                                    required={!isLogin}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 pl-12 pr-5 text-sm font-medium text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-600 transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* 错误提示 */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in fade-in duration-200">
                            <span className="material-symbols-outlined text-rose-500 text-sm">error</span>
                            <p className="text-rose-400 text-xs font-medium">{error}</p>
                        </div>
                    )}

                    {/* 成功提示 */}
                    {successMsg && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-in fade-in duration-200">
                            <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                            <p className="text-emerald-400 text-xs font-medium">{successMsg}</p>
                        </div>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        id="auth-submit"
                        disabled={loading}
                        className="w-full bg-primary disabled:opacity-50 disabled:grayscale hover:brightness-110 text-background-dark font-black py-4 rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                                处理中...
                            </>
                        ) : (
                            isLogin ? '进入应用' : '创建账号'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-600 mt-6">
                    {isLogin ? '还没有账号？' : '已有账号？'}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                        className="text-primary font-bold ml-1 hover:underline"
                    >
                        {isLogin ? '立即注册' : '立即登录'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
