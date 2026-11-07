export type TaskStatus = 'In progress' | 'In review' | 'To do' | 'Done';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type Task = { id: string; title: string; project: string; due: string; status: TaskStatus; priority: TaskPriority; progress: number; initials: string };
