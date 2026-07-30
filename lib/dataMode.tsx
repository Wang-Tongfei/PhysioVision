"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getSession } from "@/lib/api";

export type DataMode = "demo" | "live";

const DataModeContext = createContext<{
  mode: DataMode;
  ready: boolean;
}>({ mode: "live", ready: false });

export function DataModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DataMode>("live");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const email = getSession()?.user?.email?.toLowerCase();
    setMode(email === "therapist@clinic.com" ? "demo" : "live");
    window.localStorage.removeItem("physiovision.dataMode");
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <DataModeContext.Provider value={{ mode, ready }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  return useContext(DataModeContext);
}
