import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './ui/app-layout'
import { HomePage } from '../pages/home-page/ui/home-page'
import { SectionDescriptionPage } from '../pages/section-description-page/ui/section-description-page'
import { SectionDescriptionEditPage } from '../pages/section-description-edit-page/ui/section-description-edit-page'
import { ThemeManagementPage } from '../pages/theme-management-page/ui/theme-management-page'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="/themes/:themeId/description/edit"
          element={<SectionDescriptionEditPage />}
        />
        <Route
          path="/themes/:themeId/description"
          element={<SectionDescriptionPage />}
        />
        <Route path="/themes/manage" element={<ThemeManagementPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
