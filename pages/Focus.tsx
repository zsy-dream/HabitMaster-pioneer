
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { recordFocusSession, getTodayFocusStats } from '../services/focus-service';
import { addXp } from '../services/profile-service';

const Focus: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [showSettings, setShowSettings] = useState(false);
  const [flash, setFlash] = useState<'work' | 'break' | null>(null);

  // Audio state for ambient sounds
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // NOTE: 今日专注统计从 Supabase 加载，localStorage 作为降级后备
  const [completedToday, setCompletedToday] = useState(0);
  const [minutesToday, setMinutesToday] = useState(0);

  // 初始化时从数据库加载今日统计
  useEffect(() => {
    if (!user) return;
    getTodayFocusStats(user.id)
      .then(({ completedCount, totalMinutes }) => {
        setCompletedToday(completedCount);
        setMinutesToday(totalMinutes);
      })
      .catch((e) => {
        console.error('加载专注统计失败，使用 localStorage 降级:', e);
        const saved = localStorage.getItem('focus-completed-today');
        if (saved) setCompletedToday(parseInt(saved));
        const savedMin = localStorage.getItem('focus-minutes-today');
        if (savedMin) setMinutesToday(parseInt(savedMin));
      });
  }, [user]);

  const timerRef = useRef<number | null>(null);

  // Sound configurations strictly matching the labels and icons in the screenshot
  const ambientSounds = [
    { id: 'rain', label: '雨声', icon: 'water_drop', url: 'https://assets.mixkit.co/active_storage/sfx/2434/2434-preview.mp3' },
    { id: 'forest', label: '森林', icon: 'forest', url: 'https://assets.mixkit.co/active_storage/sfx/2439/2439-preview.mp3' },
    { id: 'noise', label: '白噪', icon: 'waves', url: 'https://assets.mixkit.co/active_storage/sfx/2312/2312-preview.mp3' },
    { id: 'lofi', label: '低保真', icon: 'library_music', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
    { id: 'piano', label: '钢琴', icon: 'piano', url: 'https://assets.mixkit.co/active_storage/sfx/2405/2405-preview.mp3' },
    { id: 'zen', label: '禅意', icon: 'self_improvement', url: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3' }
  ];

  // Manage ambient audio playback
  useEffect(() => {
    if (activeSoundId) {
      const sound = ambientSounds.find(s => s.id === activeSoundId);
      if (sound) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(sound.url);
        audioRef.current.loop = true;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(e => console.error("Audio playback blocked", e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeSoundId]);

  // Update volume in real-time
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync totalTime when mode or settings change
  useEffect(() => {
    const newTotal = (mode === 'work' ? workMinutes : breakMinutes) * 60;
    setTotalTime(newTotal);
    if (!isActive) {
      setTimeLeft(newTotal);
    }
  }, [mode, workMinutes, breakMinutes, isActive]);

  // NOTE: 保留 localStorage 作为离线降级方案
  useEffect(() => {
    localStorage.setItem('focus-completed-today', completedToday.toString());
    localStorage.setItem('focus-minutes-today', minutesToday.toString());
  }, [completedToday, minutesToday]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleComplete = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === 'work') {
      setCompletedToday(prev => prev + 1);
      setMinutesToday(prev => prev + workMinutes);

      // NOTE: 异步记录到 Supabase，不阻塞 UI
      if (user) {
        recordFocusSession(user.id, workMinutes, 'work')
          .catch((e) => console.error('记录专注会话失败:', e));
        // 每完成一次专注获得 40 XP
        addXp(user.id, 40)
          .catch((e) => console.error('增加 XP 失败:', e));
      }
    }

    toggleMode();
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(totalTime);
  };

  const toggleMode = () => {
    const nextMode = mode === 'work' ? 'break' : 'work';
    setFlash(nextMode);
    setTimeout(() => setFlash(null), 1000);

    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    const soundUrl = nextMode === 'work'
      ? 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
      : 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

    const transitionSound = new Audio(soundUrl);
    transitionSound.volume = 0.8;
    transitionSound.play().catch(err => console.warn("Audio play prevented:", err));

    setMode(nextMode);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = timeLeft / totalTime;

  const toggleSound = (id: string) => {
    setActiveSoundId(prev => prev === id ? null : id);
  };

  // Mode-based styles
  const themeText = mode === 'work' ? 'text-primary' : 'text-amber-400';
  const themeBgTint = mode === 'work' ? 'bg-primary/5' : 'bg-amber-400/5';

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-1000 relative overflow-hidden h-full ${mode === 'work' ? 'bg-[#0a1618]' : 'bg-[#18120a]'} text-white`}>
      {/* Background Ambient Glow */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 ${mode === 'work' ? 'bg-[radial-gradient(circle_at_center,#13c8ec_0%,transparent_70%)]' : 'bg-[radial-gradient(circle_at_center,#f59e0b_0%,transparent_70%)]'}`}></div>

      {/* Visual Flash Overlay */}
      {flash && (
        <div
          className={`fixed inset-0 z-[100] pointer-events-none transition-all duration-1000 ease-out animate-pulse ${flash === 'work' ? 'bg-primary/40' : 'bg-amber-400/40'
            }`}
        ></div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[60] bg-background-dark/95 backdrop-blur-md flex flex-col p-8 animate-in slide-in-from-bottom duration-300">
          <header className="flex justify-between items-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-white">专注设置</h2>
            <button onClick={() => setShowSettings(false)} className="size-10 flex items-center justify-center rounded-full bg-white/5">
              <span className="material-symbols-outlined text-white">close</span>
            </button>
          </header>

          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">工作时长</label>
                <span className="text-primary font-black text-xl">{workMinutes} 分钟</span>
              </div>
              <input
                type="range"
                min="1" max="60"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">休息时长</label>
                <span className="text-amber-400 font-black text-xl">{breakMinutes} 分钟</span>
              </div>
              <input
                type="range"
                min="1" max="30"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">环境音量</label>
                <span className="text-slate-100 font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-slate-500">volume_down</span>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <span className="material-symbols-outlined text-slate-500">volume_up</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('确定要重置今日数据吗？')) {
                  setCompletedToday(0);
                  setMinutesToday(0);
                }
              }}
              className="text-xs text-rose-500 font-bold uppercase tracking-widest mt-4"
            >
              重置今日统计
            </button>
          </div>

          <div className="mt-auto pb-12">
            <button
              onClick={() => setShowSettings(false)}
              className={`w-full ${mode === 'work' ? 'bg-primary' : 'bg-amber-400'} text-background-dark font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-95`}
            >
              完成设置
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex justify-between items-center relative z-10">
        <button onClick={() => navigate('/')} className="size-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <div className={`px-4 py-1.5 rounded-full bg-white/5 border transition-colors duration-1000 flex items-center gap-2 ${mode === 'work' ? 'border-primary/20' : 'border-amber-400/20'}`}>
          <div className={`size-2 rounded-full transition-colors duration-1000 ${mode === 'work' ? 'bg-primary animate-pulse' : 'bg-amber-400'}`}></div>
          <span className={`text-[10px] font-bold tracking-widest uppercase transition-colors duration-1000 ${themeText}`}>{mode === 'work' ? '深度专注' : '放松休息'}</span>
        </div>
        <button onClick={() => setShowSettings(true)} className="size-10 flex items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white">settings</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 overflow-y-auto hide-scrollbar pb-32 relative z-10">
        {/* Timer Section */}
        <div className="relative size-64 flex flex-col items-center justify-center my-8">
          <div className={`absolute inset-0 rounded-full blur-[60px] transition-all duration-1000 ${isActive ? (mode === 'work' ? 'bg-primary/25 scale-110' : 'bg-amber-400/25 scale-110') : 'opacity-0'}`}></div>

          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-white/5" cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2"></circle>
            <circle
              className={`transition-all duration-300 ease-linear ${themeText}`}
              cx="50" cy="50" r="45" fill="none" stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="283"
              strokeDashoffset={283 * (1 - progress)}
              strokeLinecap="round"
            ></circle>
          </svg>

          <div className="flex flex-col items-center relative z-10">
            <h1 className="text-6xl font-light tracking-tighter tabular-nums leading-none text-white">{formatTime(timeLeft)}</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">剩余时间</p>
          </div>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className={`${themeText} opacity-60 hover:opacity-100 text-[10px] font-bold uppercase tracking-[0.2em] transition-all mb-8`}
        >
          自定义时长
        </button>

        {/* Controls */}
        <div className="flex items-center gap-5 mb-10 w-full max-w-xs">
          <button
            onClick={resetTimer}
            className={`flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform group`}
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">replay</span>
          </button>
          <button
            onClick={toggleTimer}
            className={`size-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-90 ${mode === 'work'
                ? 'bg-primary text-background-dark shadow-primary/20'
                : 'bg-amber-400 text-background-dark shadow-amber-400/20'
              }`}
          >
            <span className="material-symbols-outlined text-3xl font-bold">{isActive ? 'pause' : 'play_arrow'}</span>
          </button>
          <button
            onClick={toggleMode}
            className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform group"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">{mode === 'work' ? 'bolt' : 'coffee'}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-12">
          {[
            { label: '今日完成', val: completedToday.toString().padStart(2, '0') },
            { label: '累计时长', val: `${minutesToday}m` },
            { label: '获得XP', val: `+${completedToday * 40}`, accent: true }
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center backdrop-blur-sm">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2">{stat.label}</span>
              <span className={`text-lg font-black transition-colors duration-1000 ${stat.accent ? themeText : 'text-slate-100'}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Ambient Sounds / Music Section */}
        <section className="w-full max-w-sm flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-[1px] w-4 bg-white/10"></div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">环境白噪音与轻音乐</p>
            <div className="h-[1px] w-4 bg-white/10"></div>
          </div>
          <div className="grid grid-cols-3 gap-6 w-full">
            {ambientSounds.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleSound(item.id)}
                className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
              >
                <div className={`size-16 rounded-2xl flex items-center justify-center transition-all border ${activeSoundId === item.id
                    ? `${themeBgTint} ${mode === 'work' ? 'border-primary/50 shadow-primary/20' : 'border-amber-400/50 shadow-amber-400/20'} shadow-lg`
                    : 'bg-white/5 border-transparent hover:border-white/10'
                  }`}>
                  <span className={`material-symbols-outlined text-2xl transition-all duration-500 ${activeSoundId === item.id ? themeText : 'text-slate-600 group-hover:text-slate-400'
                    }`}>{item.icon}</span>
                </div>
                <span className={`text-[10px] font-bold tracking-widest transition-all duration-500 ${activeSoundId === item.id ? themeText : 'text-slate-500'
                  }`}>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Focus;
