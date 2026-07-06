import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './ui/app-layout'
import { AuthLayout } from './ui/auth-layout'
import { ProtectedRoute } from './protected-route'
import { PublicRoute } from './public-route'
import { HomePage } from '../pages/home-page/ui/home-page'
import { SectionDescriptionPage } from '../pages/section-description-page/ui/section-description-page'
import { SectionDescriptionEditPage } from '../pages/section-description-edit-page/ui/section-description-edit-page'
import { ThemeManagementPage } from '../pages/theme-management-page/ui/theme-management-page'
import { PostCommentsThreadPage } from '../pages/post-comments-thread-page/ui/post-comments-thread-page'
import { SectionPostChatPage } from '../pages/section-post-chat-page/ui/section-post-chat-page'
import { SectionTaskChatPage } from '../pages/section-task-chat-page/ui/section-task-chat-page'
import { NotificationsPage } from '../pages/notifications-page/ui/notifications-page'
import { SigninPage } from '../pages/auth/ui/signin-page'
import { SignupPage } from '../pages/auth/ui/signup-page'
import { ForgotPasswordPage } from '../pages/auth/ui/forgot-password-page'
import { ResetPasswordPage } from '../pages/auth/ui/reset-password-page'

/** Не сбрасываем hash/query — в них Telegram передаёт tgWebAppData для Mini App. */
function NavigateHomePreservingTelegramContext() {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: '/', search, hash }} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<PublicRoute />}>
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
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
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/themes/:themeId/chats/:sectionId/posts/:postId/comments"
            element={<PostCommentsThreadPage />}
          />
          <Route
            path="/themes/:themeId/chats/:sectionId/posts"
            element={<SectionPostChatPage />}
          />
          <Route
            path="/themes/:themeId/chats/:sectionId/tasks"
            element={<SectionTaskChatPage />}
          />
          <Route path="*" element={<NavigateHomePreservingTelegramContext />} />
        </Route>
      </Route>
    </Routes>
  )
}
