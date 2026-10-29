import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, RequireOwner } from './AdminLayout.jsx';
import { SignInPage } from './SignInPage.jsx';
import { ImportPage } from './ImportPage.jsx';
import { ItemsPage } from './ItemsPage.jsx';
import { PhotosPage } from './PhotosPage.jsx';
import { HistoryPage } from './HistoryPage.jsx';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="sign-in" element={<SignInPage />} />
      <Route element={<RequireOwner><AdminLayout /></RequireOwner>}>
        <Route index element={<Navigate to="import" replace />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="items/:itemId/photos" element={<PhotosPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="import" replace />} />
      </Route>
    </Routes>
  );
}
