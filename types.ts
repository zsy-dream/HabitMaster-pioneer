
export enum Category {
  HEALTH = '健康',
  WORK = '工作',
  PERSONAL = '个人',
  SOCIAL = '社交',
  STUDY = '学习'
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  time: string;
  completed: boolean;
  icon: string;
  color: string;
}

export interface UserStats {
  level: number;
  rank: string;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  maxStreak: number;
}
