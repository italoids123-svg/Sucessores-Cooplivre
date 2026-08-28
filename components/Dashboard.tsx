"use client";

import ChairModal from "./ChairModal";
import CriteriaPage from "./CriteriaPage";
import EligibilityPage from "./EligibilityPage";
import LevelPages from "./LevelPages";
import Notice from "./Notice";
import QuestionnairePage from "./QuestionnairePage";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { AppProvider } from "@/lib/context";

export default function Dashboard() {
  return (
    <AppProvider>
      <TopBar />
      <div className="shell">
        <Sidebar />
        <main>
          <Notice />
          <LevelPages />
          <EligibilityPage />
          <CriteriaPage />
          <QuestionnairePage />
        </main>
      </div>
      <ChairModal />
    </AppProvider>
  );
}
