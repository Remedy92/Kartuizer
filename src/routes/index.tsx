import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout, AdminLayout } from '@/components/layout'
import { ProtectedRoute } from './ProtectedRoute'
import { ApprovedRoute } from './ApprovedRoute'
import { AdminRoute } from './AdminRoute'

// Lazy load pages
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { PendingApprovalPage } from '@/features/auth/pages/PendingApprovalPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ArchivePage } from '@/features/archive/pages/ArchivePage'
import { AdminDashboard } from '@/features/admin/pages/AdminDashboard'
import { ManageQuestionsPage } from '@/features/admin/pages/ManageQuestionsPage'
import { CreateQuestionPage } from '@/features/admin/pages/CreateQuestionPage'
import { ManageGroupsPage } from '@/features/admin/pages/ManageGroupsPage'
import { ManageUsersPage } from '@/features/admin/pages/ManageUsersPage'
import { AnalyticsPage } from '@/features/admin/pages/AnalyticsPage'
import { AdminPendingUsersPage } from '@/features/admin/pages/AdminPendingUsersPage'
import { AdminSettingsPage } from '@/features/admin/pages/AdminSettingsPage'
import { MyGroupsPage } from '@/features/groups/pages/MyGroupsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'overview', element: <Navigate to="/dashboard" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          // Pending approval page - accessible by pending users
          { path: 'pending-approval', element: <PendingApprovalPage /> },
          {
            // All other authenticated routes require approval
            element: <ApprovedRoute />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'groepen', element: <MyGroupsPage /> },
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
                      { path: 'users/pending', element: <AdminPendingUsersPage /> },
                      { path: 'analytics', element: <AnalyticsPage /> },
                      { path: 'settings', element: <AdminSettingsPage /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
