import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { InventoryPage } from './pages/InventoryPage.jsx';
import { ItemPage } from './pages/ItemPage.jsx';
import { VisitPage } from './pages/VisitPage.jsx';
import { SellPage } from './pages/SellPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { Loading } from './components/States.jsx';

// Owner screens (and the spreadsheet libraries) load only when an owner opens them.
const AdminRoutes = lazy(() => import('./admin/AdminRoutes.jsx'));
// The client proposal is its own page (no storefront header/footer) and loads only when opened.
const ProposalPage = lazy(() => import('./proposal/ProposalPage.jsx'));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="item/:itemId" element={<ItemPage />} />
        <Route path="visit" element={<VisitPage />} />
        <Route path="sell" element={<SellPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="owner/*"
        element={
          <Suspense fallback={<Loading />}>
            <AdminRoutes />
          </Suspense>
        }
      />
      <Route
        path="proposal"
        element={
          <Suspense fallback={<Loading />}>
            <ProposalPage />
          </Suspense>
        }
      />
      <Route path="admin" element={<Navigate to="/owner" replace />} />
    </Routes>
  );
}
