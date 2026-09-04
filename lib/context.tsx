"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CHAIRS as INITIAL_CHAIRS, HIERARQUIA, PEOPLE as INITIAL_PEOPLE } from "./data";
import { clearPersistedState, loadPersistedState, savePersistedState } from "./persistence";
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
  resetBase: () => void;
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
  const [hydrated, setHydrated] = useState(false);

  const hierMap = useMemo(() => buildHierMap(HIERARQUIA), []);

  useEffect(() => {
    // Recupera a última base salva neste navegador (localStorage) — evita
    // perder o que foi carregado ao simplesmente recarregar a página.
    // Roda uma única vez, após montar, para não divergir da renderização
    // inicial do servidor (que não tem acesso a localStorage).
    const stored = loadPersistedState();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata a partir do localStorage, só roda uma vez ao montar
      setChairs(stored.chairs);
      setPeople(stored.people);
      setSuccession(stored.succession);
      setDataVersion(stored.dataVersion);
      setBaseUpdatedAt(stored.baseUpdatedAt ? new Date(stored.baseUpdatedAt) : new Date());
    } else {
      setBaseUpdatedAt(new Date());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Só passa a salvar depois que a hidratação acima terminou, senão o
    // estado inicial (vazio) sobrescreveria uma base já salva antes dela
    // ser lida.
    if (!hydrated) return;
    savePersistedState({
      chairs,
      people,
      succession,
      dataVersion,
      baseUpdatedAt: baseUpdatedAt ? baseUpdatedAt.toISOString() : null,
    });
  }, [hydrated, chairs, people, succession, dataVersion, baseUpdatedAt]);

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
      showNotice(result.noticeHtml + " Fica salvo neste navegador — ao voltar aqui depois, os dados continuam.");
    },
    [chairs, people, succession, showNotice]
  );

  const resetBase = useCallback(() => {
    clearPersistedState();
    setChairs(INITIAL_CHAIRS);
    setPeople(INITIAL_PEOPLE);
    setSuccession({});
    setDataVersion((v) => v + 1);
    setBaseUpdatedAt(new Date());
    showNotice("Base salva neste navegador foi apagada — voltou ao ponto de partida (sem dados de sucessão).");
  }, [showNotice]);

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
    resetBase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
