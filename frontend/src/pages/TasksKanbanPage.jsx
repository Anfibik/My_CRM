import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Grid, Paper, Container } from '@mui/material';
import { STATUS_LABELS } from '../constants'; 
import { getStatusLabel, getStatusColor } from '../utils/taskUtils'; 
import TaskCard from '../components/tasks/TaskCard';

const COLUMN_ORDER = [
  'not_accepted',
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'closed',
];

const getColumnHeaderStyling = (statusKey) => {
  const colorInfo = getStatusColor(statusKey); // Вызываем один раз

  let backgroundColor = 'grey.200'; // Дефолтный фон
  let textColor = 'common.black';   // Дефолтный цвет текста (изменил на черный для лучшей читаемости на grey.200)

  if (colorInfo && typeof colorInfo === 'object') {
    backgroundColor = colorInfo.headerBg || colorInfo.bg || backgroundColor;
    textColor = colorInfo.textColor; // Если есть textColor, используем его

    // Если textColor не задан явно, пытаемся определить его на основе фона
    if (!textColor) {
      if (backgroundColor.includes('warning') || backgroundColor.includes('info') || backgroundColor === 'grey.200' || backgroundColor === 'grey.100') {
        textColor = 'common.black';
      } else {
        textColor = 'common.white'; // Для большинства других цветных фонов
      }
    }
  } else if (typeof colorInfo === 'string') {
    backgroundColor = colorInfo;
    // Определяем цвет текста на основе строкового значения фона
    if (backgroundColor.includes('warning') || backgroundColor.includes('info') || backgroundColor.includes('grey')) {
      textColor = 'common.black';
    } else {
      textColor = 'common.white';
    }
  } else {
    // Фолбэк switch по statusKey, если getStatusColor ничего не вернул или вернул не то
    switch (statusKey) {
      case 'not_accepted':
        backgroundColor = '#d32f2f'; // красный
        textColor = 'common.white';
        break;
      case 'pending':
        backgroundColor = '#ed6c02'; // оранжевый
        textColor = 'common.white';
        break;
      case 'accepted':
        backgroundColor = '#0288d1'; // синий
        textColor = 'common.white';
        break;
      case 'in_progress':
      case 'completed':
        backgroundColor = '#2e7d32'; // зеленый
        textColor = 'common.white';
        break;
      default:
        // backgroundColor уже 'grey.200', textColor 'common.black'
        break;
    }
  }
  return { backgroundColor, color: textColor };
};

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
      height: '100%', // Занимаем всю высоту, предоставленную родительским контейнером из App.js
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Box sx={{
        display: 'flex',
        overflowX: 'auto', // Горизонтальный скролл для колонок
        overflowY: 'hidden', // Запрещаем вертикальный скролл здесь, он будет внутри колонок
        flexGrow: 1,         // Занимает все доступное вертикальное пространство
        p: 1,
        gap: 2,
        alignItems: 'stretch', // Важно, чтобы колонки растягивались по высоте родителя
        minHeight: 0,  // Новое: важно для корректного расчёта flex-элементов
      }}>
        {COLUMN_ORDER.map((statusKey) => (
          <Paper
            key={statusKey}
            elevation={3}
            sx={{
              width: '200px', // Чуть шире, чтобы убрать возможный гор. скролл
              flexShrink: 0,
              height: '100%',      // Явно занять всю высоту родителя
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',  // Paper сама не скроллится
            }}
          >
            {/* Column Header - Direct child of Paper */}
            <Box sx={{
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              flexShrink: 0, // Header does not shrink
              ...getColumnHeaderStyling(statusKey),
            }}>
              <Typography variant="h6" component="div" sx={{ fontSize: '1rem' }}>
                {getStatusLabel(statusKey)} ({tasksByStatus[statusKey]?.length || 0})
              </Typography>
            </Box>

            {/* Scrollable Area for Cards - Direct child of Paper, after header */}
            <Box sx={{
              flexGrow: 1,    // Takes all available vertical space after header
              minHeight: 0,   // Necessary for flexGrow in a flex column
              overflowY: 'auto', // This is where the scrollbar will appear
              // Стили для скрытия стандартного скроллбара
              '&::-webkit-scrollbar': {
                display: 'none', // Chrome, Safari, Edge
              },
              '-ms-overflow-style': 'none', // IE
              'scrollbar-width': 'none', // Firefox
            }}>
              {/* Inner Box for card list styling (padding, gap) */}
              <Box sx={{
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}>
                {tasksByStatus[statusKey] && tasksByStatus[statusKey].length > 0 ? (
                  tasksByStatus[statusKey].map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))
                ) : (
                  <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Нет задач</Typography>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  );
};

export default MyTasksKanbanPage;
