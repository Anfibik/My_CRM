import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/config';
import { Box, Typography, CircularProgress, Alert, Grid, Paper, Container } from '@mui/material';
import { STATUS_LABELS } from '../constants'; 
import { getStatusLabel, getStatusColor } from '../utils/taskUtils'; 
import KanbanBoardComponent from '../components/tasks/KanbanBoardComponent';
import TaskFiltersComponent from '../components/tasks/TaskFiltersComponent';

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

    if (destination.droppableId === 'not_accepted' && source.droppableId !== 'not_accepted') {
      console.warn("Attempted to drag task into 'not_accepted' column. Operation denied.");
      return; 
    }

    const startColumnKey = source.droppableId;
    const finishColumnKey = destination.droppableId;
    const startColumnTasks = Array.from(tasksByStatus[startColumnKey] || []);
    const [movedTask] = startColumnTasks.splice(source.index, 1);

    const originalTaskStatus = movedTask.status; 
    let taskSuccessfullyUpdatedOnApi = false;

    setTasksByStatus(prevTasks => {
      const newTasks = { ...prevTasks };

      newTasks[startColumnKey] = startColumnTasks;

      const updatedMovedTask = { ...movedTask, status: finishColumnKey };

      const finishColumnTasks = Array.from(newTasks[finishColumnKey] || []);
      finishColumnTasks.splice(destination.index, 0, updatedMovedTask);
      newTasks[finishColumnKey] = finishColumnTasks;

      return newTasks;
    });

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
            const taskToRevert = { ...movedTask, status: originalTaskStatus }; 
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
    <Container maxWidth="xl" sx={{ pt: 2, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      
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
