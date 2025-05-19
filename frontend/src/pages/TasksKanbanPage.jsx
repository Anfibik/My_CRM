import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Grid, Paper, Container } from '@mui/material';
import TaskCard from '../components/tasks/TaskCard';
import { STATUS_LABELS } from '../constants'; 
import { getStatusLabel, getStatusColor } from '../utils/taskUtils'; 

const COLUMN_ORDER = [
  'not_accepted',
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'closed',
];

const MyTasksKanbanPage = () => {
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const groupTasksByStatus = useCallback((tasks) => {
    const grouped = {};
    COLUMN_ORDER.forEach(status => {
      grouped[status] = [];
    });
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        if (!grouped.unknown) grouped.unknown = [];
        grouped.unknown.push(task);
      }
    });
    return grouped;
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const authToken = localStorage.getItem('authToken');
        console.log('TasksKanbanPage: Используемый authToken:', authToken); // <--- ОТЛАДКА

        if (!authToken) {
          setError('Токен авторизации не найден. Пожалуйста, войдите в систему снова.');
          setIsLoading(false);
          // Здесь можно также вызвать logout() из AuthContext или перенаправить на страницу логина
          console.error('TasksKanbanPage: Auth token is missing from localStorage.');
          return;
        }

        const response = await axios.get('/api/tasks/my-kanban/', {
          headers: {
            Authorization: `Token ${authToken}`, // Используем переменную authToken
          },
        });
        setTasksByStatus(groupTasksByStatus(response.data));
      } catch (err) {
        console.error("Error fetching kanban tasks:", err);
        let errorMessage = 'Не удалось загрузить задачи.';
        if (err.response) {
          errorMessage = err.response.data?.detail || err.message || errorMessage;
          if (err.response.status === 401) {
            errorMessage = `Ошибка авторизации (401): ${err.response.data?.detail || 'Неверный или устаревший токен.'} Пожалуйста, попробуйте войти снова.`;
            // Дополнительно: можно рассмотреть автоматический выход пользователя или обновление токена, если есть refresh token.
            console.error('TasksKanbanPage: Authorization failed (401). Token might be invalid or expired.');
          }
        } else {
          errorMessage = err.message || errorMessage;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [groupTasksByStatus]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка задач...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Container maxWidth="xl" sx={{
      flexGrow: 1,       // <--- ИЗМЕНЕНИЕ: Занять доступное пространство как flex-элемент
      minHeight: 0,      // <--- ДОБАВЛЕНО: Важно для корректного сжатия flex-элементов
      display: 'flex',
      flexDirection: 'column'
      // Отступы mt, mb были убраны, так как управляются p:2 родителя в App.js
    }}>
      {/* Заголовок H1 был удален пользователем */}
      <Box // Columns Gutter (container for all columns)
        sx={{
          height: '100%', // Оставляем, чтобы взять высоту родительского Container
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch', // Колонки растягиваются на высоту этого Box
          overflowX: 'auto',   // Horizontal scroll for columns themselves
          gap: 2,
          p: 1,                // Padding for the gutter around columns
        }}
      >
        {COLUMN_ORDER.map((statusKey) => (
          <Paper // Each Kanban Column
            key={statusKey}
            elevation={3}
            sx={{
              width: '210px',     // Adjusted width for cards of 172px + padding
              minHeight: 0,        // ВАЖНО: для корректной работы flex/overflow у дочерних
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'grey.100',
            }}
          >
            <Box /* Column Header */
              sx={{ 
                p: 1.5,             // Padding for the header text
                pb: 1,              // Slightly less padding bottom for header
                textAlign: 'center',
                borderRadius: '4px 4px 0 0', // Rounded corners only at the top
                backgroundColor: getStatusColor(statusKey) || 'primary.main',
                color: (getStatusColor(statusKey) && (getStatusColor(statusKey).includes('warning') || getStatusColor(statusKey).includes('info'))) ? 'common.black' : 'common.white',
                boxShadow: 1,
                flexShrink: 0,      // Header should not shrink
              }}
            >
              <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                {getStatusLabel(statusKey)} ({tasksByStatus[statusKey]?.length || 0})
              </Typography>
            </Box>
            <Box /* Cards Scrollable Area */
              sx={{
                flexGrow: 1,          // Takes up remaining space in the Paper column
                minHeight: 0,         // Crucial for flex children with overflow
                overflowY: 'auto',
                p: 1.5,               // Padding around the list of cards
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {tasksByStatus[statusKey] && tasksByStatus[statusKey].length > 0 ? (
                tasksByStatus[statusKey].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))
              ) : (
                <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                  Нет задач
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  );
};

export default MyTasksKanbanPage;
