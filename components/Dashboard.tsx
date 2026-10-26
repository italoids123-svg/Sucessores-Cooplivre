"use client";

import AgencyGroupPage from "./AgencyGroupPage";
import ChairModal from "./ChairModal";
import ConselhoPage from "./ConselhoPage";
import CriteriaPage from "./CriteriaPage";
import CrossInterestsPage from "./CrossInterestsPage";
import EligibilityPage from "./EligibilityPage";
import LevelPages from "./LevelPages";
import Notice from "./Notice";
import OtherInterestsPage from "./OtherInterestsPage";
import OverviewPage from "./OverviewPage";
import PersonSearchPage from "./PersonSearchPage";
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
          <PersonSearchPage />
          <AgencyGroupPage group="uad" />
          <AgencyGroupPage group="agencias" />
          <LevelPages />
          <EligibilityPage />
          <CriteriaPage />
          <QuestionnairePage />
          <CrossInterestsPage />
          <ConselhoPage />
          <OtherInterestsPage />
        </main>
      </div>
      <ChairModal />
    </AppProvider>
  );
}
