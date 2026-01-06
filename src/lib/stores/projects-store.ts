import { create } from "zustand";
import type { Project, ProjectStatus } from "../projects-api";
import {
  createProject as apiCreateProject,
  getProject as apiGetProject,
  listProjects as apiListProjects,
  subscribeToProjectEvents,
  type ProjectEventCallbacks,
} from "../projects-api";

type ProjectStore = {
  projects: Project[];
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setLoading: (loading: boolean) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (url: string, name?: string) => Promise<Project>;
  subscribeToProject: (
    projectId: string,
    callbacks: ProjectEventCallbacks
  ) => () => void;
};

export const useProjectsStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await apiListProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      set({ isLoading: false });
    }
  },

  fetchProject: async (id) => {
    try {
      const project = await apiGetProject(id);
      set((state) => {
        const existing = state.projects.find((p) => p.id === id);
        if (existing) {
          return {
            projects: state.projects.map((p) => (p.id === id ? project : p)),
          };
        } else {
          return {
            projects: [project, ...state.projects],
          };
        }
      });
    } catch (error) {
      console.error("Failed to fetch project:", error);
    }
  },

  createProject: async (url, name) => {
    const response = await apiCreateProject(url, name);
    const project: Project = {
      id: response.projectId,
      name: response.name,
      url,
      company_name: response.companyName,
      status: "pending",
      error_message: null,
      pdf_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isProcessing: true,
    };
    get().addProject(project);
    return project;
  },

  subscribeToProject: (projectId, callbacks) => {
    return subscribeToProjectEvents(projectId, {
      ...callbacks,
      onStatus: (status, message) => {
        get().updateProject(projectId, {
          status,
          isProcessing: status !== "completed" && status !== "failed",
        });
        callbacks.onStatus?.(status, message);
      },
      onComplete: (data) => {
        get().updateProject(projectId, {
          status: "completed",
          isProcessing: false,
        });
        callbacks.onComplete?.(data);
      },
      onError: (error) => {
        get().updateProject(projectId, {
          status: "failed",
          error_message: error,
          isProcessing: false,
        });
        callbacks.onError?.(error);
      },
    });
  },
}));

