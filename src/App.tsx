import { Navigate, Route, Routes } from 'react-router'

import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route index element={<Navigate to="/app/dashboard" replace />} />
      <Route index path='/dashboard' Component={DashboardPage} />
      <Route index path='/settings' Component={SettingsPage} />
    </Routes>
  )
}

export default App
