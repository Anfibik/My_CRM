import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, IconButton, Grid, Card, CardContent, Chip, CircularProgress, Divider, Tooltip, useTheme } from '@mui/material';
import api from '../../api/config'; // Импортируем наш экземпляр api
import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DoneIcon from '@mui/icons-material/Done';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import LoopIcon from '@mui/icons-material/Loop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ConstructionIcon from '@mui/icons-material/Construction';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import TaskModal from './TaskModal'; 
import TaskCard from './TaskCard.jsx'; 
import { STATUS_LABELS, TASK_TYPE_LABELS } from '../../constants'; // Import constants
import { getDeadlineInfo } from '../../utils/deadlineUtils.js'; // Новый импорт
import { addParticipantToDealIfNeeded } from '../../api/deals'; // <-- Добавлен импорт
import eventBus from '../../utils/eventBus'; // <-- Добавлен импорт eventBus

// Ленивая загрузка модального окна, чтобы избежать циклических зависимостей
// const TaskModal = lazy(() => import('./TaskModal'));

const getTaskTypeLabel = (taskType) => {
  return TASK_TYPE_LABELS[taskType] || 'Неизвестный тип';
};

const TasksArea = ({ deal }) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загружаем задачи для текущей сделки
  useEffect(() => {
    if (deal?.id) {
      setIsLoading(true);
      api.get(`/api/tasks/?deal=${deal.id}`)
        .then(response => {
          setTasks(response.data);
          setError(null);
        })
        .catch(error => {
          console.error("Ошибка при загрузке задач:", error);
          setError('Не удалось загрузить задачи.');
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Загружаем список пользователей для модального окна
      api.get('/api/users/')
        .then(response => {
          setUsers(response.data);
        })
        .catch(error => {
          console.error("Ошибка при загрузке пользователей:", error);
          // Можно установить состояние ошибки для пользователей, если это необходимо
        });
    } else {
      setTasks([]); // Очищаем задачи, если сделка не выбрана
      setIsLoading(false);
    }
  }, [deal?.id]);

  // Функция для обновления статуса задачи в UI
  const handleTaskStatusUpdate = (taskId, updatedTask) => {
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === taskId ? updatedTask : t
      )
    );
  };

  // Загрузка текущего пользователя
  const [currentUser, setCurrentUser] = useState(null);

  // Загрузка текущего пользователя
  useEffect(() => {
    // console.log('Попытка загрузить текущего пользователя...');
    api.get('/api/auth/me', { withCredentials: true })
      .then(response => {
        // console.log('Текущий пользователь загружен:', response.data);
        setCurrentUser(response.data);
      })
      .catch(error => {
        console.error("Ошибка загрузки текущего пользователя:", error);
      });
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Обработчик для onSubmit из TaskModal
  // Теперь он принимает уже созданную задачу
  const handleTaskCreated = (createdTask) => {
    if (createdTask) {
      setTasks(prevTasks => [createdTask, ...prevTasks]); // Добавляем новую задачу в начало списка
      // eventBus.emit('showAlert', { message: 'Задача успешно создана!', type: 'success' }); // Пример уведомления
      setError(null); // Сбрасываем предыдущие ошибки, если были
    }
    // Модальное окно закрывается в самом TaskModal через closeAll(), который вызывает onClose, 
    // так что здесь дополнительно закрывать его не нужно.
  };

  // Хелперы для отображения статуса и приоритета
  const getStatusColor = (status) => {
    const colors = {
      'not_accepted': 'error',
      'pending': 'warning',
      'accepted': 'secondary',
      'in_progress': 'primary',
      'completed': 'success',
      'closed': 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    return STATUS_LABELS[status] || 'Неизвестно';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'not_accepted': <CancelIcon fontSize="small" />,
      'pending': <PauseCircleOutlineIcon fontSize="small" />,
      'accepted': <CheckCircleOutlineIcon fontSize="small" />,
      'in_progress': <ConstructionIcon  fontSize="small" />,
      'completed': <DoneIcon fontSize="small" />,
      'closed': <LockOutlinedIcon fontSize="small" />
    };
    return icons[status] || null;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'action.active',
      'high': 'warning'
    };
    return colors[priority] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Планово',
      'high': 'Критично'
    };
    return labels[priority] || 'Неизвестно';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'low': <LoopIcon fontSize="small" />,
      'high': <WarningAmberIcon fontSize="small" />
    };
    return icons[priority] || null;
  };

  return (
    <div className="p-2">
      <Box sx={{display: 'flex', alignItems: 'center' }}>

        <Box sx={{ mr: 2, alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Задачи <IconButton
              color="primary"
              onClick={handleOpenModal}
              disabled={!deal?.id}
              aria-label="Добавить задачу"
            > <AddIcon />
            </IconButton>
          </Typography>
        </Box>
        
        <Box sx={{ mr: 2 }}>фильтр 1</Box>
        <Box sx={{ mr: 2 }}>фильтр 2</Box>
        <Box sx={{ mr: 2 }}>фильтр 3 </Box>

      </Box>

      <Divider sx={{ my: 1, mt: 0 }} />

      {error && (
        <Box sx={{ mb: 2, color: 'error.main' }}>
          {error}
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 0 }}>
          Загрузка...
        </Box>
      ) : tasks.length > 0 ? (
        <Grid container spacing={1}>
          {tasks.map(task => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
              <TaskCard task={task} onTaskUpdate={handleTaskStatusUpdate} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {deal?.id ? 'Задачи отсутствуют. Создайте первую задачу.' : 'Сначала выберите сделку.'}
        </Box>
      )}

      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}>
        {isModalOpen && (
          <TaskModal
            open={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleTaskCreated} // <--- Используем новую функцию
            users={users}
            dealId={deal?.id}
          />
        )}
      </Suspense>
    </div>
  );
};

export default TasksArea;
