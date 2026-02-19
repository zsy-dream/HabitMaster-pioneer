
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Task } from '../types';

interface HomeProps {
  tasks: Task[];
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const Home: React.FC<HomeProps> = ({ tasks, toggleTask, deleteTask }) => {
  const [quote, setQuote] = useState('“合抱之木，生于毫末；九层之台，起于累土。”');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Reorder tasks: uncompleted first, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const fetchNewQuote = async () => {
    setIsRefreshing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: '请提供一条简短的、关于习惯或个人成长的励志箴言，使用中文，字数控制在20字以内。只需返回箴言文本内容，不要引号。',
      });
      if (response.text) {
        setQuote(`“${response.text.trim()}”`);
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // NOTE: 动态生成本周日历，以周一为起点，今天高亮
  const today = new Date();
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const EN_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // JS getDay() 0=周日，1=周一... 转换为 0=周一，6=周日
  const todayJsDay = today.getDay();
  const todayWeekIndex = todayJsDay === 0 ? 6 : todayJsDay - 1;
  // 计算本周一的日期
  const monday = new Date(today);
  monday.setDate(today.getDate() - todayWeekIndex);
  // 生成周一到周日共 7 天
  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, day: d.getDate(), active: i === todayWeekIndex, dateObj: d };
  });
  const headerDayEn = EN_DAY_NAMES[todayWeekIndex];
  const headerDate = `${today.getMonth() + 1}月${today.getDate()}日`;

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 pb-40 animate-in fade-in duration-500 overflow-y-auto bg-background-dark text-slate-100">
      <header className="px-6 pt-12 pb-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold text-primary tracking-[0.2em] mb-1 opacity-80 uppercase">{headerDayEn}</p>
          <h1 className="text-4xl font-bold tracking-tight font-display">{headerDate}</h1>
        </div>
        <div className="relative size-16 flex items-center justify-center">
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100">
            <circle className="text-white/5" cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"></circle>
            <circle
              className="text-primary transition-all duration-1000 ease-out"
              cx="50" cy="50" r="45" fill="none" stroke="currentColor"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 * (1 - progress / 100)}
              strokeLinecap="round"
            ></circle>
          </svg>
          <span className="text-[10px] font-black text-white">{progress}%</span>
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Quote Card */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 relative overflow-hidden group backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-[2px] bg-primary"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">每日箴言</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fetchNewQuote(); }}
              className={`text-slate-500 hover:text-primary transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
            </button>
          </div>
          <p className="text-lg leading-relaxed font-medium italic text-slate-200">
            {quote}
          </p>
          <span className="absolute -bottom-4 -right-2 text-6xl text-white/5 font-serif select-none group-hover:text-primary/5 transition-colors">”</span>
        </div>

        {/* Calendar Row */}
        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar gap-3 py-2">
          {days.map((d, i) => (
            <div
              key={i}
              className={`flex flex-col items-center gap-2 p-3 min-w-[56px] rounded-2xl transition-all duration-300 ${d.active
                  ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105'
                  : 'bg-white/5 border border-white/5 text-slate-400'
                }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70">{d.name}</span>
              <span className="text-lg font-black">{d.day}</span>
            </div>
          ))}
        </div>

        {/* Tasks Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-xl font-bold tracking-tight">今日目标</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">已完成 {completedCount}/{tasks.length}</p>
          </div>

          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`relative flex items-center gap-4 p-5 rounded-3xl transition-all duration-500 border ${task.completed
                    ? 'bg-white/[0.02] border-white/5 opacity-60'
                    : 'bg-white/5 border-white/10 shadow-xl shadow-black/10'
                  }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`size-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${task.completed
                      ? 'bg-primary text-background-dark'
                      : 'border-2 border-white/10 hover:border-primary/50'
                    }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {task.completed ? 'check' : ''}
                  </span>
                </button>

                <div className="flex-1">
                  <h3 className={`font-bold transition-all ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{task.category}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">• {task.time}</span>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-500"
                  >
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>

                  {activeMenuId === task.id && (
                    <div className="absolute right-0 top-10 w-28 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-20 py-1 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                        className="w-full px-4 py-3 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
