import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";

import AuthPage from "@/pages/AuthPage";
import HubPage from "@/pages/HubPage";
import CollectionPage from "@/pages/CollectionPage";
import SummonPage from "@/pages/SummonPage";
import BattlePage from "@/pages/BattlePage";
import CalculatorPage from "@/pages/CalculatorPage";
import HeroDetailPage from "@/pages/HeroDetailPage";
import AllHeroesPage from "@/pages/AllHeroesPage";
import AllArtifactsPage from "@/pages/AllArtifactsPage";
import InventoryPage from "@/pages/InventoryPage";
import ComparePage from "@/pages/ComparePage";
import ForgePage from "@/pages/ForgePage";
import CampaignPage from "@/pages/CampaignPage";
import TrialsPage from "@/pages/TrialsPage";
import ArenaPage from "@/pages/ArenaPage";
import TemplesPage from "@/pages/TemplesPage";
import TempleFloorsPage from "@/pages/TempleFloorsPage";
import SettingsPage from "@/pages/SettingsPage";
import TavernPage from "@/pages/TavernPage";
import SquadsPage from "@/pages/SquadsPage";
import MorePage from "@/pages/MorePage";
import ShopPage from "@/pages/ShopPage";
import AncientForgePage from "@/pages/AncientForgePage";
import WorldBossPage from "@/pages/WorldBossPage";
import CerberusPage from "@/pages/CerberusPage";
import WorldBossListPage from "@/pages/WorldBossListPage";
import AncientTowerPage from "@/pages/AncientTowerPage";
import Hero3DShowcasePage from "@/pages/Hero3DShowcasePage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.email !== 'wowcv@yandex.ru') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-2">⚔️</div>
          <p className="text-muted-foreground font-kelly">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <GameProvider>
      <div>
        <Routes>
          <Route path="/" element={<HubPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/summon" element={<SummonPage />} />
          <Route path="/battle" element={<BattlePage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/heroes" element={<AllHeroesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/artifacts" element={<AllArtifactsPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/forge" element={<ForgePage />} />
          <Route path="/campaign" element={<CampaignPage />} />
          <Route path="/trials" element={<TrialsPage />} />
          <Route path="/trials/arena" element={<ArenaPage />} />
          <Route path="/trials/worldboss" element={<WorldBossListPage />} />
          <Route path="/trials/worldboss/hydra" element={<WorldBossPage />} />
          <Route path="/trials/worldboss/cerberus" element={<CerberusPage />} />
          <Route path="/temples" element={<TemplesPage />} />
          <Route path="/temples/:templeId" element={<TempleFloorsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/squads" element={<SquadsPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/shop" element={<AdminRoute><ShopPage /></AdminRoute>} />
          <Route path="/ancient-forge" element={<AncientForgePage />} />
          <Route path="/ancient-tower" element={<AncientTowerPage />} />
          <Route path="/hero/:id" element={<HeroDetailPage />} />
          <Route path="/hero-3d-showcase" element={<Hero3DShowcasePage />} />
          <Route path="/tavern/:id" element={<TavernPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        
      </div>
    </GameProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
