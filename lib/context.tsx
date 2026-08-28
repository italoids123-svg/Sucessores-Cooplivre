"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CHAIRS as INITIAL_CHAIRS, HIERARQUIA, PEOPLE as INITIAL_PEOPLE } from "./data";
import { buildHierMap } from "./scoring";
import type { Chair, NavPage, Person, SuccessionMap } from "./types";
import { downloadWorkbook, parseUploadedWorkbook } from "./workbook";

interface AppContextValue {
  chairs: Chair[];
  people: Person[];
  hierarquia: typeof HIERARQUIA;
  hierMap: Record<string, string>;
  succession: SuccessionMap;
  dataVersion: number;
  baseUpdatedAt: Date | null;

  activePage: NavPage;
  setActivePage: (p: NavPage) => void;

  modalChairId: string | null;
  openModal: (chairId: string) => void;
  closeModal: () => void;

  showNominal: boolean;
  setShowNominal: (v: boolean) => void;

  notice: string | null;
  showNotice: (msg: string) => void;
  closeNotice: () => void;

  downloadBase: () => void;
  uploadBase: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [chairs, setChairs] = useState<Chair[]>(INITIAL_CHAIRS);
  const [people, setPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [succession, setSuccession] = useState<SuccessionMap>({});
  const [dataVersion, setDataVersion] = useState(0);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<Date | null>(null);

  const [activePage, setActivePage] = useState<NavPage>("directors");
  const [modalChairId, setModalChairId] = useState<string | null>(null);
  const [showNominal, setShowNominal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const hierMap = useMemo(() => buildHierMap(HIERARQUIA), []);

  useEffect(() => {
    // Lê o relógio do cliente uma única vez após montar, para evitar
    // divergência de hidratação entre o timestamp do servidor e do navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBaseUpdatedAt(new Date());
  }, []);

  const openModal = useCallback((chairId: string) => setModalChairId(chairId), []);
  const closeModal = useCallback(() => setModalChairId(null), []);

  const showNotice = useCallback((msg: string) => setNotice(msg), []);
  const closeNotice = useCallback(() => setNotice(null), []);

  const downloadBase = useCallback(() => {
    downloadWorkbook(chairs, people, HIERARQUIA, succession);
    showNotice(
      "Base baixada no formato padrão (Leia-me, Cadeiras, Base de dados, Hierarquia). Preencha offline e recarregue — o próximo carregamento reconstrói tudo a partir deste arquivo."
    );
  }, [chairs, people, succession, showNotice]);

  const uploadBase = useCallback(
    async (file: File) => {
      const result = await parseUploadedWorkbook(file, chairs, people, succession);
      if ("error" in result) {
        showNotice(result.error);
        return;
      }
      setChairs(result.chairs);
      setPeople(result.people);
      setSuccession(result.succession);
      setDataVersion((v) => v + 1);
      setBaseUpdatedAt(new Date());
      showNotice(result.noticeHtml);
    },
    [chairs, people, succession, showNotice]
  );

  const value: AppContextValue = {
    chairs,
    people,
    hierarquia: HIERARQUIA,
    hierMap,
    succession,
    dataVersion,
    baseUpdatedAt,
    activePage,
    setActivePage,
    modalChairId,
    openModal,
    closeModal,
    showNominal,
    setShowNominal,
    notice,
    showNotice,
    closeNotice,
    downloadBase,
    uploadBase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
