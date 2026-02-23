import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navbar from './components/Layout/Navbar'
import OrderPage from './components/Orders/OrderPage'
import MasterDataPage from './components/MasterData/MasterDataPage'
import Toast from './components/common/Toast'
import Lightbox from './components/common/Lightbox'

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/master/*" element={<MasterDataPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast />
        <Lightbox />
      </AppProvider>
    </HashRouter>
  )
}
