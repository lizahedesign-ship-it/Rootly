import { create } from 'zustand';

interface Task {
  id: string;
  childId: string;
  name: string;
  icon: string;
  category: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  createdAt: string;
}

interface TaskCompletion {
  id: string;
  taskId: string;
  completedAt: string;
}

interface TasksState {
  tasksByChildId: Record<string, Task[]>;
  completionsByDate: Record<string, TaskCompletion[]>;
  setTasksForChild: (childId: string, tasks: Task[]) => void;
  setCompletionsForDate: (date: string, completions: TaskCompletion[]) => void;
}

export const useTasksStore = create<TasksState>((set) => ({
  tasksByChildId: {},
  completionsByDate: {},
  setTasksForChild: (childId, tasks) =>
    set((state) => ({
      tasksByChildId: { ...state.tasksByChildId, [childId]: tasks },
    })),
  setCompletionsForDate: (date, completions) =>
    set((state) => ({
      completionsByDate: { ...state.completionsByDate, [date]: completions },
    })),
}));
