
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, Task } from '../types';

interface NewTaskProps {
  addTask: (task: Task) => void;
}

const NewTask: React.FC<NewTaskProps> = ({ addTask }) => {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [activeCategory, setActiveCategory] = useState(Category.HEALTH);
  const [activeColor, setActiveColor] = useState('bg-primary');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri by default
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('08:30');

  const categories = [
    { type: Category.HEALTH, icon: 'fitness_center' },
    { type: Category.WORK, icon: 'work' },
    { type: Category.STUDY, icon: 'school' },
    { type: Category.PERSONAL, icon: 'person' },
    { type: Category.SOCIAL, icon: 'groups' },
  ];

  const colors = [
    'bg-primary', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-purple-500', 'bg-slate-500'
  ];

  const days = ['一', '二', '三', '四', '五', '六', '日'];

  const toggleDay = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index));
    } else {
      setSelectedDays([...selectedDays, index].sort());
    }
  };

  const handleSave = () => {
    if (!goal.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: goal,
      category: activeCategory,
      time: reminderEnabled ? `上午 ${reminderTime}` : '全天',
      completed: false,
      icon: categories.find(c => c.type === activeCategory)?.icon || 'star',
      color: activeColor.replace('bg-', '')
    };
    
    addTask(newTask);
    navigate('/');
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 animate-in slide-in-from-bottom duration-500 bg-background-light dark:bg-background-dark">
      <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 flex size-10 items-center justify-start active:scale-90 transition-transform">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold">新建任务</h1>
        <button 
          onClick={handleSave} 
          disabled={!goal.trim()}
          className="flex px-4 py-1 rounded-full items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
        >
          <span className="text-primary text-base font-bold">保存</span>
        </button>
      </header>

      <main className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <label className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider px-1">你的目标是什么？</label>
          <input 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            autoFocus
            className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-2xl h-16 px-5 text-lg font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-700 shadow-inner transition-all" 
            placeholder="例如：晨间瑜伽" 
            type="text"
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider px-1">分类</h3>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.type;
              return (
                <button 
                  key={cat.type}
                  onClick={() => setActiveCategory(cat.type)}
                  className="flex flex-col items-center gap-2 group transition-all"
                >
                  <div className={`size-16 flex items-center justify-center rounded-2xl transition-all active:scale-95 ${
                    isActive 
                      ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105' 
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                  </div>
                  <span className={`text-xs font-bold transition-colors ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                    {cat.type}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider px-1">频率</h3>
          <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl">
            {(['daily', 'weekly', 'custom'] as const).map((mode) => (
              <button 
                key={mode}
                onClick={() => setFrequency(mode)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                  frequency === mode 
                    ? 'bg-white dark:bg-slate-800 shadow-md text-slate-900 dark:text-slate-100' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {mode === 'daily' ? '每日' : mode === 'weekly' ? '每周' : '自定义'}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {days.map((day, i) => {
              const isActive = selectedDays.includes(i);
              return (
                <button 
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`size-10 flex items-center justify-center rounded-full text-xs font-black transition-all active:scale-90 ${
                    isActive 
                      ? 'bg-primary text-background-dark scale-110 shadow-md shadow-primary/30' 
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 mb-1">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">提醒</h3>
            <button 
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${reminderEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div 
            onClick={() => {
              if (reminderEnabled) {
                const newTime = prompt('请输入提醒时间 (HH:mm)', reminderTime);
                if (newTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(newTime)) setReminderTime(newTime);
              }
            }}
            className={`flex items-center justify-between p-5 bg-slate-100 dark:bg-slate-900 rounded-2xl cursor-pointer active:scale-[0.98] transition-all border border-transparent ${!reminderEnabled ? 'opacity-30 grayscale pointer-events-none' : 'hover:border-primary/20'}`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">通知时间</span>
            </div>
            <span className="text-primary font-black text-xl tracking-widest">{reminderTime}</span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider px-1">任务主题</h3>
          <div className="flex gap-5 overflow-x-auto hide-scrollbar py-3 px-1">
            {colors.map(color => (
              <button 
                key={color}
                onClick={() => setActiveColor(color)}
                className={`size-10 shrink-0 rounded-full ${color} transition-all flex items-center justify-center relative active:scale-90 ${
                  activeColor === color 
                    ? 'ring-4 ring-offset-4 ring-primary scale-110 dark:ring-offset-background-dark' 
                    : 'hover:scale-110'
                }`}
              >
                {activeColor === color && (
                  <span className="material-symbols-outlined text-white text-base font-black animate-in zoom-in duration-300">check</span>
                )}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark/95 to-transparent max-w-[430px] mx-auto z-40">
        <button 
          onClick={handleSave}
          disabled={!goal.trim()}
          className="w-full bg-primary disabled:opacity-30 disabled:grayscale hover:brightness-110 text-background-dark font-black py-5 rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-95"
        >
          创建习惯
        </button>
      </div>
    </div>
  );
};

export default NewTask;
