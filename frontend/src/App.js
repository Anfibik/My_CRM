import React, { useEffect, useContext, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ContactProvider } from './context/ContactContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorDisplay from './components/common/ErrorDisplay';
import CompanyListPage from './pages/CompanyListPage';
import ContactListPage from './pages/ContactListPage';
import LeadListPage from './pages/LeadListPage';
import DealListPage from './pages/DealListPage';
import InquiryListPage from './pages/InquiryListPage';
import TaskDetailPage from './pages/TaskDetailPage';
import UserAuthModal from './components/auth/UserAuthModal';
import { Box } from '@mui/material';

const DealDetailPage = lazy(() => import('./pages/DealDetailPage'));
const TasksKanbanPage = lazy(() => import('./pages/TasksKanbanPage'));

const AppContent = () => {
  const { user, logout, error, isAuthenticated, loading: isLoadingAuth } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (isLoadingAuth) {
      console.log('Authentication is loading, WebSocket connection deferred.');
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close();
        console.log('Closed WebSocket because authentication is in progress.');
      }
      socketRef.current = null;
      return;
    }

    if (isAuthenticated && user) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = 'localhost:8000';
      const socketUrl = `${wsProtocol}//${wsHost}/ws/notifications/`;

      console.log(`Attempting to connect to WebSocket at: ${socketUrl} for user ${user?.id || 'unknown'} (Auth loaded)`);

      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close();
          console.log('Previous WebSocket connection (if any) closed before creating a new one.');
        }
      }

      const newSocket = new WebSocket(socketUrl);
      socketRef.current = newSocket;

      newSocket.onopen = () => {
        console.log('WebSocket connection established (frontend)');
      };

      newSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Message from server (frontend):', data);
        if (data.type === 'connection_established') {
          console.log(`WebSocket says: ${data.message}`);
        } else if (data.type === 'notification') {
          console.log('Received legacy notification (frontend):', data.payload);
        } else if (data.type === 'data_update') {
          console.log('Received data update (frontend):', data.data);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed (frontend):', event);
        if (socketRef.current === newSocket) {
          socketRef.current = null;
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error (frontend):', error);
        if (socketRef.current === newSocket) {
          socketRef.current = null;
        }
      };

      return () => {
        if (newSocket.readyState === WebSocket.OPEN || newSocket.readyState === WebSocket.CONNECTING) {
          newSocket.close();
          console.log('WebSocket connection (created by this effect) closed on component unmount/re-render or dependency change.');
        }
        if (socketRef.current === newSocket) {
          socketRef.current = null;
        }
      };
    } else {
      console.log('User not authenticated or user data not available (Auth loaded), ensuring WebSocket is closed.');
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
          socketRef.current.close();
          console.log('Closed WebSocket from ref because user is not authenticated after auth load.');
        }
        socketRef.current = null;
      }
    }
  }, [isAuthenticated, user, isLoadingAuth]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-xl">Загрузка аутентификации...</p>
      </div>
    );
  }

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
          <li>
            <Link to="/my-tasks-kanban" className="text-white hover:text-gray-300">
              Мои задачи (Канбан)
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

      <Box sx={{ 
        height: 'calc(100vh - 40px)', // Высота за вычетом нав. панели
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto' // Позволить скролл на уровне всего контента страницы, если он превышает доступную высоту
      }}>
        <Box sx={{ 
          p: 2, // Сохраняем отступы, которые были у div className="p-2"
          flexGrow: 1, 
          overflowY: 'auto',   // Позволяем вертикальный скролл, если контент не помещается
          display: 'flex',      // Чтобы TasksKanbanPage (если это flex) мог растянуться
          flexDirection: 'column' // Чтобы TasksKanbanPage (если это flex) мог растянуться
        }}>
          <Suspense fallback={<div>Загрузка страницы...</div>}>
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
              <Route
                path="/my-tasks-kanban"
                element={
                  <ProtectedRoute>
                    <TasksKanbanPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/companies" replace />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>
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
