import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ContactProvider } from './context/ContactContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorDisplay from './components/ErrorDisplay';
import CompanyListPage from './pages/CompanyListPage';
import ContactListPage from './pages/ContactListPage';
import LeadListPage from './pages/LeadListPage';
import DealListPage from './pages/DealListPage';
import InquiryListPage from './pages/InquiryListPage';
import DealDetailPage from './pages/DealDetailPage';
import TaskDetailPage from './pages/TaskDetailPage';
import UserAuthModal from './components/UserAuthModal';

const AppContent = () => {
  const { user, logout, error } = useAuth();

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col justify-center items-center">
        <h2 className="text-2xl mb-4">Пожалуйста, войдите в систему</h2>
        <UserAuthModal />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <nav className="h-[40px] bg-gray-800 p-1 flex justify-between items-center">
        <ul className="flex space-x-4">
          <li>
            <Link to="/inquiries" className="text-white hover:text-gray-300">
              Обращения
            </Link>
          </li>
          <li>
            <Link to="/contacts" className="text-white hover:text-gray-300">
              Контакты
            </Link>
          </li>
          <li>
            <Link to="/companies" className="text-white hover:text-gray-300">
              Компании
            </Link>
          </li>
          <li>
            <Link to="/leads" className="text-white hover:text-gray-300">
              Лиды
            </Link>
          </li>
          <li>
            <Link to="/deals" className="text-white hover:text-gray-300">
              Сделки
            </Link>
          </li>
        </ul>
        <div className="flex items-center">
          <span className="text-white mr-3">{user.full_name}</span>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Выйти
          </button>
        </div>
      </nav>

      <div className="p-2">
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <CompanyProvider>
                  <CompanyListPage />
                </CompanyProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <ContactProvider>
                  <ContactListPage />
                </ContactProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deals"
            element={
              <ProtectedRoute>
                <DealListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deals/:id"
            element={
              <ProtectedRoute>
                <DealDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <TaskDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inquiries"
            element={
              <ProtectedRoute>
                <InquiryListPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/companies" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
