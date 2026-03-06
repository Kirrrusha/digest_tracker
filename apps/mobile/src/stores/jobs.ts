import { create } from "zustand";

interface JobsState {
  activeJobs: Set<string>;
  addJob: (jobId: string) => void;
  removeJob: (jobId: string) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  activeJobs: new Set(),
  addJob: (jobId) => set((state) => ({ activeJobs: new Set([...state.activeJobs, jobId]) })),
  removeJob: (jobId) =>
    set((state) => {
      const next = new Set(state.activeJobs);
      next.delete(jobId);
      return { activeJobs: next };
    }),
}));
