"use client";

import ChairModal from "./ChairModal";
import CityPage from "./CityPage";
import CriteriaPage from "./CriteriaPage";
import EligibilityPage from "./EligibilityPage";
import LevelPages from "./LevelPages";
import MapPage from "./MapPage";
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
          <MapPage />
          <CityPage />
        </main>
      </div>
      <ChairModal />
    </AppProvider>
  );
}
