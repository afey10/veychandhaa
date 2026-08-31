import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import AddChandhaa from './pages/AddChandhaa'
import ChandhaaRecords from './pages/ChandhaaRecords'
import AddExpense from './pages/AddExpense'
import ExpenseRecords from './pages/ExpenseRecords'
import MonthlyReport from './pages/reports/MonthlyReport'
import CollectionReport from './pages/reports/CollectionReport'
import ExpenseReport from './pages/reports/ExpenseReport'
import FinancialSummary from './pages/reports/FinancialSummary'
import Users from './pages/administration/Users'
import ExpenseCategories from './pages/administration/ExpenseCategories'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            <Route
              path="/chandhaa/add"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'staff']}>
                  <AddChandhaa />
                </ProtectedRoute>
              }
            />
            <Route path="/chandhaa/records" element={<ProtectedRoute><ChandhaaRecords /></ProtectedRoute>} />

            <Route
              path="/expenses/add"
              element={
                <ProtectedRoute allowedRoles={['administrator', 'staff']}>
                  <AddExpense />
                </ProtectedRoute>
              }
            />
            <Route path="/expenses/records" element={<ProtectedRoute><ExpenseRecords /></ProtectedRoute>} />

            <Route path="/reports/monthly" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />
            <Route path="/reports/collection" element={<ProtectedRoute><CollectionReport /></ProtectedRoute>} />
            <Route path="/reports/expense" element={<ProtectedRoute><ExpenseReport /></ProtectedRoute>} />
            <Route path="/reports/summary" element={<ProtectedRoute><FinancialSummary /></ProtectedRoute>} />

            <Route
              path="/administration/users"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/administration/categories"
              element={
                <ProtectedRoute allowedRoles={['administrator']}>
                  <ExpenseCategories />
                </ProtectedRoute>
              }
            />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
