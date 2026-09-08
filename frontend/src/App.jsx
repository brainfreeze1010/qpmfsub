import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useStore from './store/useStore'

import Layout from './components/Layout'
import Login from './pages/Login'
import TransactionEntry from './pages/branch/TransactionEntry'
import TransactionList from './pages/branch/TransactionList'
import Dashboard from './pages/ho/Dashboard'
import HOTransactionList from './pages/ho/HOTransactionList'
import TransactionDetail from './pages/ho/TransactionDetail'
import Banking from './pages/ho/Banking'
import Reconciliation from './pages/ho/Reconciliation'
import ManualMapping from './pages/ho/ManualMapping'

const HO_ROLES = ['ho_maker', 'ho_checker', 'ho_admin']

function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'branch_user') {
      return <Navigate to="/branch/transactions" replace />
    }
    return <Navigate to="/ho/dashboard" replace />
  }

  return children
}

function RoleRedirect() {
  const { user, token } = useStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'branch_user') {
    return <Navigate to="/branch/transactions" replace />
  }

  return <Navigate to="/ho/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<RoleRedirect />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['branch_user', ...HO_ROLES]}>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Branch routes */}
        <Route
          path="/branch/transactions/new"
          element={
            <ProtectedRoute allowedRoles={['branch_user']}>
              <TransactionEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch/transactions"
          element={
            <ProtectedRoute allowedRoles={['branch_user']}>
              <TransactionList />
            </ProtectedRoute>
          }
        />

        {/* HO routes */}
        <Route
          path="/ho/dashboard"
          element={
            <ProtectedRoute allowedRoles={HO_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho/transactions"
          element={
            <ProtectedRoute allowedRoles={HO_ROLES}>
              <HOTransactionList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho/transactions/:id"
          element={
            <ProtectedRoute allowedRoles={[...HO_ROLES, 'branch_user']}>
              <TransactionDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho/banking"
          element={
            <ProtectedRoute allowedRoles={HO_ROLES}>
              <Banking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho/reconciliation"
          element={
            <ProtectedRoute allowedRoles={HO_ROLES}>
              <Reconciliation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ho/reconciliation/mapping"
          element={
            <ProtectedRoute allowedRoles={HO_ROLES}>
              <ManualMapping />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
