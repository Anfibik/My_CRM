import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/config';
import { Box, Typography, CircularProgress, Alert, Grid, Paper, Container } from '@mui/material';
import { STATUS_LABELS } from '../constants'; 
import { getStatusLabel, getStatusColor } from '../utils/taskUtils'; 
import KanbanBoardComponent from '../components/tasks/KanbanBoardComponent';
import TaskFiltersComponent from '../components/tasks/TaskFiltersComponent';
import { useAuth } from '../context/AuthContext'; // Импорт useAuth

const COLUMN_ORDER = [
  'not_accepted',
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'closed',
];

const getColumnHeaderStyling = (statusKey) => {
  const colorInfo = getStatusColor(statusKey); 

  if (statusKey === 'not_accepted') {
    return { backgroundColor: 'error.main', color: 'common.white', borderBottom: '3px solid #b2102f' }; 
  }

  let backgroundColor = 'grey.200'; 
  let textColor = 'common.black';   

  if (colorInfo && typeof colorInfo === 'object') {
    backgroundColor = colorInfo.headerBg || colorInfo.bg || backgroundColor;
    textColor = colorInfo.textColor; 

    if (!textColor) {
      if (backgroundColor.includes('warning') || backgroundColor.includes('info') || backgroundColor === 'grey.200' || backgroundColor === 'grey.100') {
        textColor = 'common.black';
      } else {
        textColor = 'common.white'; 
      }
    }
  } else if (typeof colorInfo === 'string') {
    backgroundColor = colorInfo;
    if (backgroundColor.includes('warning') || backgroundColor.includes('info') || backgroundColor.includes('grey')) {
      textColor = 'common.black';
    } else {
      textColor = 'common.white';
    }
  } else {
    switch (statusKey) {
      case 'not_accepted':
        backgroundColor = '#d32f2f'; 
        textColor = 'common.white';
        break;
      case 'pending':
        backgroundColor = '#ed6c02'; 
        textColor = 'common.white';
        break;
      case 'accepted':
        backgroundColor = '#0288d1'; 
        textColor = 'common.white';
        break;
      case 'in_progress':
      case 'completed':
        backgroundColor = '#2e7d32'; 
        textColor = 'common.white';
        break;
      default:
        break;
    }
  }
  return { backgroundColor, color: textColor };
};

const MyTasksKanbanPage = () => {
  const { user: currentUser } = useAuth(); // Получение currentUser
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [orderedStatuses, setOrderedStatuses] = useState(COLUMN_ORDER); 
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
        console.warn(`Задача с ID ${task.id} имеет неизвестный статус: ${task.status}`);
      }
    });

    return grouped;
  }, []); 

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const authToken = localStorage.getItem('authToken');
      console.log('TasksKanbanPage: Используемый authToken:', authToken); 

      if (!authToken) {
        setError('Токен авторизации не найден. Пожалуйста, войдите в систему снова.');
        setIsLoading(false);
        console.error('TasksKanbanPage: Auth token is missing from localStorage.');
        return;
      }

      const response = await api.get('/api/tasks/my-kanban/', {
        headers: {
          Authorization: `Token ${authToken}`, 
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
          console.error('TasksKanbanPage: Authorization failed (401). Token might be invalid or expired.');
        }
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [groupTasksByStatus]);

  const onDragEndHandler = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Находим перемещаемую задачу ДО того, как она будет удалена из startColumnTasks
    const startColumnKeyForLookup = source.droppableId;
    const tasksInStartColumnForLookup = Array.from(tasksByStatus[startColumnKeyForLookup] || []);
    const movedTaskOriginal = tasksInStartColumnForLookup.find(task => task.id.toString() === draggableId);

    if (!movedTaskOriginal) {
      console.error("Перемещаемая задача не найдена! ID:", draggableId);
      // Можно добавить уведомление пользователю или более сложную обработку
      return; // Задача не найдена, выходим
    }
    
    // --- ПРОВЕРКА ПРАВ (Feature Flag Logic) ---
    const isChangingColumn = destination.droppableId !== source.droppableId;

    if (isChangingColumn) {
      if (movedTaskOriginal.permissions) {
        // НОВАЯ ЛОГИКА: используем права с бэкенда
        const { can_change_status, can_close } = movedTaskOriginal.permissions;
        
        // Запрещаем, если пытаются закрыть задачу без права на закрытие
        if (destination.droppableId === 'closed' && !can_close) {
          return;
        }
        
        // Запрещаем, если пытаются изменить статус (в любую другую колонку) без права на это
        if (destination.droppableId !== 'closed' && !can_change_status) {
          return;
        }
      } else {
        // СТАРАЯ ЛОГИКА (ИСПРАВЛЕННАЯ): рассчитываем права на фронтенде
        const isAuthor = currentUser && movedTaskOriginal.author === currentUser.id;
        const assigneeId = movedTaskOriginal.assignee?.id ?? movedTaskOriginal.assignee;
        const isAssignee = currentUser && assigneeId === currentUser.id;
        const isParticipant = currentUser && Array.isArray(movedTaskOriginal.participants) && movedTaskOriginal.participants.includes(currentUser.id);

        const canChangeStatus = isAssignee || isParticipant;
        const canClose = isAuthor;

        const destinationIsClosed = destination.droppableId === 'closed';

        // Если пытаются закрыть задачу
        if (destinationIsClosed) {
          if (!canClose) {
            return; // Запрещено, если не автор
          }
        } 
        // Если пытаются изменить статус (не закрыть)
        else {
          if (!canChangeStatus) {
            // Запрещено, если не исполнитель/участник (автор без этих ролей может только закрывать)
            return;
          }
        }
      }
    }

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) { // Повторная проверка, т.к. предыдущая была для !destination
      return;
    }

    if (destination.droppableId === 'not_accepted' && source.droppableId !== 'not_accepted') {
      console.warn("Attempted to drag task into 'not_accepted' column. Operation denied.");
      return; 
    }

    const startColumnKey = source.droppableId;
    const finishColumnKey = destination.droppableId;
    
    // Используем movedTaskOriginal для получения originalTaskStatus, 
    // а для оптимистичного обновления и API будем использовать копию, которую извлечем ниже
    const originalTaskStatus = movedTaskOriginal.status; 

    // Оптимистичное обновление UI
    const newTasksByStatusState = { ...tasksByStatus };
    const sourceTasks = Array.from(newTasksByStatusState[startColumnKey] || []);
    const [taskToMoveOptimistic] = sourceTasks.splice(source.index, 1); // Извлекаем задачу для перемещения
    newTasksByStatusState[startColumnKey] = sourceTasks;

    const destinationTasks = Array.from(newTasksByStatusState[finishColumnKey] || []);
    // Обновляем статус у копии задачи перед вставкой
    const updatedTaskForOptimisticUI = { ...taskToMoveOptimistic, status: finishColumnKey }; 
    destinationTasks.splice(destination.index, 0, updatedTaskForOptimisticUI);
    newTasksByStatusState[finishColumnKey] = destinationTasks;

    setTasksByStatus(newTasksByStatusState);

    // API вызов для обновления статуса
    // movedTask здесь должна быть задачей, которую мы действительно отправляем на сервер (taskToMoveOptimistic)
    // или, если быть точным, ее ID и новый статус. 
    let taskSuccessfullyUpdatedOnApi = false;



    if (originalTaskStatus !== finishColumnKey) {
      api.patch(`/api/tasks/${draggableId}/`, { status: finishColumnKey })
        .then(response => {
          console.log('Task updated successfully on API:', response.data);
          taskSuccessfullyUpdatedOnApi = true;
          setTasksByStatus(prev => {
            const newTasksByStatus = { ...prev };
            const tasksInFinishColumn = (newTasksByStatus[finishColumnKey] || []).map(task => 
              task.id.toString() === draggableId ? response.data : task
            );
            newTasksByStatus[finishColumnKey] = tasksInFinishColumn;
            return newTasksByStatus;
          });
        })
        .catch(err => {
          console.error('Failed to update task on API:', err);
          setError('Не удалось обновить статус задачи. Изменения отменены.');

          setTasksByStatus(prevTasks => {
            const revertedTasks = { ...prevTasks };

            const currentFinishTasks = Array.from(revertedTasks[finishColumnKey] || []);
            revertedTasks[finishColumnKey] = currentFinishTasks.filter(task => task.id.toString() !== draggableId);

            const currentStartTasks = Array.from(revertedTasks[startColumnKey] || []);
            // Используем movedTaskOriginal для возврата
            const taskToRevert = { ...movedTaskOriginal, status: originalTaskStatus }; 
            currentStartTasks.splice(source.index, 0, taskToRevert);
            revertedTasks[startColumnKey] = currentStartTasks;

            return revertedTasks;
          });
        });
    } else {
      console.log('Task moved within the same column. Order update API call can be added here if needed.');
    }
  };

  const handleTaskUpdateInternal = useCallback(() => {
    fetchTasks(); 
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, []);

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
    <Container 
      maxWidth="xl" 
      sx={{ 
        pt: 2, 
        display: 'flex', 
        flexDirection: 'column',
        flexGrow: 1, 
        minHeight: 0 
      }}
    >
      
      <TaskFiltersComponent /> 

      <Box sx={{ flexGrow: 1, overflowX: 'auto', minHeight: 0 }}>
        <KanbanBoardComponent 
          columns={tasksByStatus}
          columnOrder={orderedStatuses}
          onDragEnd={onDragEndHandler}
          onTaskUpdate={handleTaskUpdateInternal}
          getColumnHeaderStyling={getColumnHeaderStyling} 
          getStatusLabel={getStatusLabel}                 
        />
      </Box>

    </Container>
  );
};

export default MyTasksKanbanPage;
