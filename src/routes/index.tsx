import { createBrowserRouter } from 'react-router-dom'
import { RootLayout, AdminLayout } from '@/components/layout'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute } from './AdminRoute'

// Lazy load pages
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ArchivePage } from '@/features/archive/pages/ArchivePage'
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard'
import { ManageQuestionsPage } from '@/features/admin/pages/ManageQuestionsPage'
import { CreateQuestionPage } from '@/features/admin/pages/CreateQuestionPage'
import { ManageGroupsPage } from '@/features/admin/pages/ManageGroupsPage'
import { ManageUsersPage } from '@/features/admin/pages/ManageUsersPage'
import { AnalyticsPage } from '@/features/admin/pages/AnalyticsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'archive', element: <ArchivePage /> },
          {
            path: 'admin',
            element: <AdminRoute />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminDashboard /> },
                  { path: 'questions', element: <ManageQuestionsPage /> },
                  { path: 'questions/new', element: <CreateQuestionPage /> },
                  { path: 'groups', element: <ManageGroupsPage /> },
                  { path: 'users', element: <ManageUsersPage /> },
                  { path: 'analytics', element: <AnalyticsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
