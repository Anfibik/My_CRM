import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Box, Typography, IconButton, Card, CardContent, Chip, CircularProgress, Divider, Tooltip, useTheme, Alert } from '@mui/material';
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

const getTaskTypeLabel = (taskType) => {
  return TASK_TYPE_LABELS[taskType] || 'Неизвестный тип';
};

const TasksArea = ({
  deal,
  title = "Задачи", 
  apiStatusFilter = null, 
  clientSideFilter = null, 
  CardComponent = TaskCard, 
  onCardClick = null, 
  showAddTaskButton = true, 
  titleVariant = 'h6',      
  gridSpacing = 1,        
}) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (showAddTaskButton && deal?.id) {
      api.get('/api/users/')
        .then(response => setUsers(response.data))
        .catch(err => console.error("Ошибка загрузки пользователей:", err));
      
      api.get('/api/auth/me', { withCredentials: true })
        .then(response => setCurrentUser(response.data))
        .catch(err => console.error("Ошибка загрузки текущего пользователя:", err));
    } else {
      setUsers([]);
      setCurrentUser(null);
    }
  }, [showAddTaskButton, deal?.id]);

  // Функция для загрузки задач
  const fetchTasks = useCallback(async (currentDealId) => {
    if (!currentDealId) {
      setTasks([]);
      setIsLoading(false);
      setError(null); // Сбрасываем ошибку, если ID сделки нет
      return;
    }
    setIsLoading(true); // ВРЕМЕННО ЗАКОММЕНТИРОВАТЬ
    setError(null);
    try {
      let apiUrl = `/api/tasks/?deal=${currentDealId}`;
      if (apiStatusFilter) {
        apiUrl += `&status=${apiStatusFilter}`;
      }
      const response = await api.get(apiUrl);
      let fetchedTasks = response.data || [];

      if (clientSideFilter) {
        fetchedTasks = fetchedTasks.filter(clientSideFilter);
      }
      
      fetchedTasks.sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline) : null;
        const bDeadline = b.deadline ? new Date(b.deadline) : null;

        if (!aDeadline && !bDeadline) return 0; 
        if (!aDeadline) return -1; 
        if (!bDeadline) return 1;  
        
        return aDeadline - bDeadline; 
      });

      setTasks(fetchedTasks);
    } catch (err) {
      console.error("Ошибка при загрузке задач:", err);
      setError("Не удалось загрузить задачи. Попробуйте позже.");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiStatusFilter, clientSideFilter]);

  // Загружаем задачи для текущей сделки при изменении deal.id
  useEffect(() => {
    fetchTasks(deal?.id);
  }, [deal?.id, fetchTasks]);

  // Подписка на событие создания новой задачи
  useEffect(() => {
    // Создаем конкретную функцию-обработчик для event listener
    const eventHandler = (eventData) => {
      // Проверяем, что событие содержит ID сделки и что оно соответствует текущей открытой сделке
      if (eventData && eventData.dealId && deal?.id && eventData.dealId === deal.id) {
        fetchTasks(deal.id);
      } else if (eventData && eventData.dealId && deal?.id && eventData.dealId !== deal.id) {
      }
    };

    eventBus.on('taskAutomaticallyCreated', eventHandler);
    eventBus.on('taskManuallyCreated', eventHandler); 
    eventBus.on('taskUpdated', eventHandler); 

    // Отписка от события при размонтировании компонента
    return () => {
      eventBus.remove('taskAutomaticallyCreated', eventHandler); 
      eventBus.remove('taskManuallyCreated', eventHandler);
      eventBus.remove('taskUpdated', eventHandler);
    };
  }, [deal?.id, fetchTasks]); // Добавляем deal?.id и fetchTasks в зависимости, чтобы обработчик всегда имел актуальные данные

  // Функция для обновления статуса задачи в UI
  const handleTaskStatusUpdate = (updatedTask) => { 
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(t => 
        t.id === updatedTask.id ? updatedTask : t 
      );
      return newTasks;
    });
    eventBus.dispatch('taskUpdated', updatedTask);
  };

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

  // Если нет сделки и кнопка добавления не отображается, то компонент не рендерим
  // или если нет сделки, но кнопка должна быть, то показываем сообщение о необходимости выбрать сделку
  if (!deal?.id && !showAddTaskButton) {
    return null; 
  }
  if (!deal?.id && showAddTaskButton) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant={titleVariant} gutterBottom component="div">
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Выберите или создайте сделку, чтобы добавить или просмотреть задачи.
        </Typography>
      </Box>
    );
  }

  return (
    // Обертка Box вместо div для лучшей интеграции с MUI и применения sx
    <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant={titleVariant} component="div" sx={{ mb: 0 }}> {/* Используем titleVariant */}
          {title}
        </Typography>
        {showAddTaskButton && deal?.id && ( /* Условие для кнопки */
          <Tooltip title="Добавить задачу">
            <IconButton 
              color="primary"
              onClick={handleOpenModal}
              size="small" // Делаем иконку немного меньше
              aria-label="Добавить задачу"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
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
        <Box 
          sx={{
            display: 'flex',       // Включаем flexbox
            flexDirection: 'row',  // Элементы в ряд
            overflowX: 'auto',     // Горизонтальный скролл
            overflowY: 'hidden',   // Скрыть вертикальный скролл
            mt: 0.5,               // Сохраняем отступ сверху
            pb: 1,                 // Отступ снизу для полосы прокрутки
            gap: theme.spacing(gridSpacing), // Промежуток между карточками
            // pt: 1, py: 1 // Можно добавить, если нужен общий вертикальный отступ для содержимого скролл-контейнера
          }}
        >
          {tasks.map((task) => (
            <Box 
              key={task.id}
              sx={{
                flexShrink: 0,     // Запрещаем сжатие карточки
                pt: 0.5,           // Сохраняем вертикальные отступы для самой карточки
                pb: 0.5
              }}
            >
              <CardComponent 
                task={task} 
                onTaskUpdate={handleTaskStatusUpdate} 
                onDeleteTask={() => {}}
                // Для CompactTaskCard передаем onCardClick, если он есть
                {...(CardComponent.name === 'CompactTaskCard' && onCardClick ? { onClick: () => onCardClick(task) } : {})}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {apiStatusFilter === 'closed' ? 'Архив задач пуст.' : 'Задачи отсутствуют.'}
        </Box>
      )}

      {showAddTaskButton && deal?.id && ( /* Условие для модального окна */
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}>
          {isModalOpen && (
            <TaskModal
              open={isModalOpen}
              onClose={handleCloseModal}
              onSubmit={handleTaskCreated}
              users={users}
              dealId={deal.id} 
              currentUser={currentUser}
            />
          )}
        </Suspense>
      )}
    </Box>
  );
};

export default TasksArea;
