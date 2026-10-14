"use client";

import AgencyGroupPage from "./AgencyGroupPage";
import ChairModal from "./ChairModal";
import CityPage from "./CityPage";
import CriteriaPage from "./CriteriaPage";
import EligibilityPage from "./EligibilityPage";
import LevelPages from "./LevelPages";
import MapPage from "./MapPage";
import Notice from "./Notice";
import OtherInterestsPage from "./OtherInterestsPage";
import OverviewPage from "./OverviewPage";
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
          <OverviewPage />
          <AgencyGroupPage group="uad" />
          <AgencyGroupPage group="agencias" />
          <LevelPages />
          <EligibilityPage />
          <CriteriaPage />
          <QuestionnairePage />
          <MapPage />
          <CityPage />
          <OtherInterestsPage />
        </main>
      </div>
      <ChairModal />
    </AppProvider>
  );
}
