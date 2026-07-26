import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

type Workspace = {
  _id: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
};

type WorkspaceContextValue = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  workspaceBusy: boolean;
  workspaceError: string;
  setActiveWorkspaceId: (id: string) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const WORKSPACE_ID_KEY = "api-monitor-workspace-id";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() =>
    localStorage.getItem(WORKSPACE_ID_KEY)
  );
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w._id === activeWorkspaceId) || workspaces[0] || null;
  }, [workspaces, activeWorkspaceId]);

  const setActiveWorkspaceId = (id: string) => {
    localStorage.setItem(WORKSPACE_ID_KEY, id);
    setActiveWorkspaceIdState(id);
  };

  const loadWorkspaces = async () => {
    if (!token) return;
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      const data = await api.getWorkspaces(token);
      setWorkspaces(data);
      if (data.length > 0) {
        const currentActiveStillExists = data.some((w: any) => w._id === activeWorkspaceId);
        if (!activeWorkspaceId || !currentActiveStillExists) {
          setActiveWorkspaceId(data[0]._id);
        }
      } else {
        localStorage.removeItem(WORKSPACE_ID_KEY);
        setActiveWorkspaceIdState(null);
      }
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to load workspaces");
    } finally {
      setWorkspaceBusy(false);
    }
  };

  const createWorkspace = async (name: string) => {
    if (!token) return;
    setWorkspaceBusy(true);
    setWorkspaceError("");
    try {
      const newWs = await api.createWorkspace(token, name);
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs._id);
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to create workspace");
      throw err;
    } finally {
      setWorkspaceBusy(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      localStorage.removeItem(WORKSPACE_ID_KEY);
      setActiveWorkspaceIdState(null);
    }
  }, [token]);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      activeWorkspaceId: activeWorkspace?._id || null,
      workspaceBusy,
      workspaceError,
      setActiveWorkspaceId,
      loadWorkspaces,
      createWorkspace,
    }),
    [workspaces, activeWorkspace, workspaceBusy, workspaceError]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
