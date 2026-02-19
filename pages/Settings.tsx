/**
 * 设置页面
 * NOTE: 接入 Supabase 用户资料，支持真实的昵称/邮箱持久化更新
 * 深色模式开关状态也同步到数据库
 */
import React, { useState, useEffect } from 'react';
import { signOut } from '../services/auth-service';
import { updateProfile } from '../services/profile-service';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  profile: ProfileRow | null;
  setProfile: (profile: ProfileRow) => void;
}

type SettingsView = 'main' | 'personal' | 'security' | 'notifications' | 'theme' | 'data';

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode, profile, setProfile }) => {
  const { user, retryLoadProfile } = useAuth();
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  const [retrying, setRetrying] = useState(false);

  /**
   * 手动重试加载用户资料
   * NOTE: 网络不好时用户可以点击重试按钮
   */
  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryLoadProfile();
    } finally {
      setRetrying(false);
    }
  };

  // 编辑用的临时 state（取消时恢复原值）
  const [tempNickname, setTempNickname] = useState(profile?.nickname ?? '');
  const [tempEmail, setTempEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // NOTE: 主题色从 localStorage 读取，调用 applyAccentColor 后实时注入 CSS 变量
  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('accent-color') ?? '#13c8ec';
  });

  /**
   * 切换全局主色调
   * 通过修改 :root 的 CSS 变量 --color-primary 实现实时换色
   */
  const applyAccentColor = (hex: string) => {
    setAccentColor(hex);
    localStorage.setItem('accent-color', hex);
    document.documentElement.style.setProperty('--color-primary', hex);
  };

  // 初始化时同步 CSS 变量（防止刷新后丢失）
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', accentColor);
  }, []);

  // profile 更新时同步临时 state
  useEffect(() => {
    if (profile) {
      setTempNickname(profile.nickname);
      setTempEmail(profile.email);
    }
  }, [profile]);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const rank = profile?.rank ?? '新手探索者';
  const streak = profile?.streak ?? 0;
  const maxStreak = profile?.max_streak ?? 0;
  const XP_PER_LEVEL = 1200;

  /**
   * 处理深色模式切换，同步到数据库
   */
  const handleDarkModeToggle = async (newVal: boolean) => {
    setDarkMode(newVal);
    if (user && profile) {
      try {
        const updated = await updateProfile(user.id, { dark_mode: newVal });
        setProfile(updated);
      } catch (e) {
        console.error('保存深色模式设置失败:', e);
      }
    }
  };

  /**
   * 保存个人信息（昵称/邮箱）到 Supabase
   */
  const savePersonalInfo = async () => {
    if (!tempNickname.trim() || !user) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile(user.id, {
        nickname: tempNickname.trim(),
        email: tempEmail.trim(),
      });
      setProfile(updated);
      setCurrentView('main');
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const cancelPersonalInfo = () => {
    setTempNickname(profile?.nickname ?? '');
    setTempEmail(profile?.email ?? '');
    setSaveError(null);
    setCurrentView('main');
  };

  /**
   * 登出
   */
  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      try {
        await signOut();
      } catch (e) {
        console.error('登出失败:', e);
      }
    }
  };

  // 个人信息编辑界面
  if (currentView === 'personal') {
    return (
      <div className="flex-1 animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark px-4 py-4 justify-between border-b border-slate-200 dark:border-primary/5">
          <button
            onClick={cancelPersonalInfo}
            className="flex items-center gap-1 text-primary font-bold active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">个人信息</h1>
          <button
            onClick={savePersonalInfo}
            disabled={saving || !tempNickname.trim()}
            className="text-primary font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </header>

        <main className="p-8 space-y-10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="size-28 rounded-full border-4 border-primary/20 overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img src="https://picsum.photos/seed/user/200" alt="Avatar" className="size-full object-cover" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="material-symbols-outlined text-white">photo_camera</span>
              </div>
            </div>
            <button className="text-primary font-bold text-sm tracking-widest uppercase">更换头像</button>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                昵称
              </label>
              <input
                id="settings-nickname"
                type="text"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                placeholder="例如：习惯达人"
                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl p-5 text-base font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                邮箱
              </label>
              <input
                id="settings-email"
                type="email"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl p-5 text-base font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <span className="material-symbols-outlined text-rose-500 text-sm">error</span>
              <p className="text-rose-400 text-xs font-medium">{saveError}</p>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={cancelPersonalInfo}
              className="w-full p-4 rounded-2xl border border-rose-500/20 text-rose-500 font-bold text-sm uppercase tracking-widest hover:bg-rose-500/5 active:scale-95 transition-all"
            >
              取消更改
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 主题定制界面
  if (currentView === 'theme') {
    const THEME_COLORS = [
      { name: '天青蓝', hex: '#13c8ec' },
      { name: '玫瑰红', hex: '#f43f5e' },
      { name: '琥珀橙', hex: '#f59e0b' },
      { name: '翠绿色', hex: '#10b981' },
      { name: '薰衣草', hex: '#6366f1' },
    ];

    return (
      <div className="flex-1 animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark px-4 py-4 justify-between border-b border-slate-200 dark:border-primary/5">
          <button onClick={() => setCurrentView('main')} className="flex items-center gap-1 text-primary font-bold">
            <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-bold">主题定制</h1>
          <div className="w-12"></div>
        </header>
        <main className="p-8 space-y-8">
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">主色调</h3>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
              {THEME_COLORS.map(({ name, hex }) => {
                const isSelected = accentColor === hex;
                return (
                  <button
                    key={hex}
                    onClick={() => applyAccentColor(hex)}
                    title={name}
                    className={`size-14 rounded-full cursor-pointer active:scale-90 transition-all shadow-lg flex items-center justify-center shrink-0`}
                    style={{
                      backgroundColor: hex,
                      boxShadow: isSelected ? `0 0 0 3px #1a2e30, 0 0 0 5px ${hex}` : undefined,
                    }}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-white font-bold" style={{ fontVariationSettings: "'wght' 700" }}>
                        check
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">切换主色调后实时生效，全局界面颜色跟随变化</p>
          </section>

          {/* 深色/浅色模式也放到这里方便 */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">显示模式</h3>
            <div className="flex gap-3">
              {[
                { label: '深色', icon: 'dark_mode', value: true },
                { label: '浅色', icon: 'light_mode', value: false },
              ].map(({ label, icon, value }) => (
                <button
                  key={label}
                  onClick={() => handleDarkModeToggle(value)}
                  className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all active:scale-95 ${darkMode === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                >
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  <span className="text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }


  // 主设置界面
  return (
    <div className="flex-1 overflow-y-auto pb-40 animate-in fade-in duration-500">
      <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 justify-between border-b border-slate-200 dark:border-primary/5">
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-primary font-bold">
          <span className="material-symbols-outlined text-xl">arrow_back_ios</span>
          <span className="text-sm">返回</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">我的</h1>
        <div className="w-12 text-right">
          <span className="material-symbols-outlined text-primary cursor-pointer active:scale-90 transition-transform">more_horiz</span>
        </div>
      </header>

      <main className="flex-1">
        {/* 用户信息头部 */}
        <div className="flex flex-col items-center py-8 px-6">
          <div className="relative group cursor-pointer" onClick={() => setCurrentView('personal')}>
            <div className="size-28 rounded-full border-4 border-primary p-1 bg-background-light dark:bg-background-dark group-hover:scale-105 transition-transform duration-500">
              <img
                src="https://picsum.photos/seed/user/200"
                alt="Avatar"
                className="size-full rounded-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 bg-primary text-background-dark rounded-full p-1.5 border-4 border-background-dark shadow-lg">
              <span className="material-symbols-outlined text-sm font-bold block">edit</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {profile?.nickname ?? '加载中...'}
            </h2>
            {/* NOTE: profile 为空时显示重试按钮 */}
            {!profile && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="mt-2 px-4 py-1.5 bg-primary/20 text-primary text-xs font-bold rounded-full active:scale-95 transition-all disabled:opacity-50"
              >
                {retrying ? '正在重试...' : '⟳ 点击重试加载'}
              </button>
            )}
            <p className="text-slate-500 dark:text-primary/70 text-[10px] font-bold mt-1 uppercase tracking-[0.3em]">
              等级 {level} • {rank}
            </p>
          </div>

          {/* 经验值进度条 */}
          <div className="w-full max-w-xs mt-8 group">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                下一等级: {level >= 5 ? '传奇宗师' : '进阶中'}
              </span>
              <span className="text-[10px] font-black text-primary animate-pulse">{xp} / {XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(19,200,236,0.6)]"
                style={{ width: `${Math.min((xp / XP_PER_LEVEL) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 连续打卡 */}
          <div className="flex gap-4 mt-6 w-full max-w-xs">
            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <p className="text-[9px] text-slate-500 mt-1">当前连续</p>
              <p className="text-lg font-black text-white">{streak} 天</p>
            </div>
            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-3 text-center">
              <span className="material-symbols-outlined text-amber-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                military_tech
              </span>
              <p className="text-[9px] text-slate-500 mt-1">最高连续</p>
              <p className="text-lg font-black text-white">{maxStreak} 天</p>
            </div>
          </div>
        </div>

        <div className="px-5 space-y-8">
          {/* 账号与安全 */}
          <div>
            <h3 className="px-1 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">账号与安全</h3>
            <div className="bg-white dark:bg-white/5 rounded-3xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm">
              {[
                { label: '个人信息', icon: 'person', view: 'personal' as SettingsView },
                { label: '登录与安全', icon: 'shield', view: 'security' as SettingsView },
                { label: '通知设置', icon: 'notifications', extra: '已开启', view: 'notifications' as SettingsView },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentView(item.view)}
                  className={`flex items-center justify-between p-5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer ${i !== 2 ? 'border-b border-slate-50 dark:border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.extra && <span className="text-[10px] font-bold text-slate-400">{item.extra}</span>}
                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 应用设置 */}
          <div>
            <h3 className="px-1 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">应用设置</h3>
            <div className="bg-white dark:bg-white/5 rounded-3xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-50 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined text-primary text-xl transition-all duration-500 ${darkMode ? 'rotate-180' : ''}`}>
                    {darkMode ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span className="font-semibold text-sm">深色模式</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer" onClick={() => handleDarkModeToggle(!darkMode)}>
                  <input
                    id="settings-dark-mode"
                    checked={darkMode}
                    onChange={() => handleDarkModeToggle(!darkMode)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </div>
              {[
                { label: '主题定制', icon: 'palette', view: 'theme' as SettingsView },
                { label: '数据与导出', icon: 'database', view: 'data' as SettingsView },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentView(item.view)}
                  className={`flex items-center justify-between p-5 active:bg-slate-50 dark:active:bg-white/5 transition-colors cursor-pointer ${i === 0 ? 'border-b border-slate-50 dark:border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                    <span className="font-semibold text-sm">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                </div>
              ))}
            </div>
          </div>

          {/* 退出登录 */}
          <div className="pt-4 pb-12">
            <button
              id="settings-logout"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-5 rounded-2xl bg-primary/10 text-primary font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-sm shadow-primary/5"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              退出当前账号
            </button>
            <div className="mt-10 flex flex-col items-center gap-1 opacity-40">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em]">HabitMaster Pro</p>
              <p className="text-[9px] font-medium">版本 2.4.1 (构建 892)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
