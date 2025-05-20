import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/config';
import { Box, Typography, CircularProgress, Alert, Grid, Paper, Container } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
  const [orderedStatuses, setOrderedStatuses] = useState(COLUMN_ORDER); // Используем COLUMN_ORDER для инициализации
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

        const response = await api.get('/api/tasks/my-kanban/', {
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

  const onDragEndHandler = (result) => {
    const { source, destination, draggableId } = result;

    // 1. Если бросили вне контекста или на то же самое место
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const startColumnKey = source.droppableId;
    const finishColumnKey = destination.droppableId;
    const startColumnTasks = Array.from(tasksByStatus[startColumnKey] || []);
    const [movedTask] = startColumnTasks.splice(source.index, 1);

    const originalTaskStatus = movedTask.status; // Сохраняем оригинальный статус
    let taskSuccessfullyUpdatedOnApi = false;

    setTasksByStatus(prevTasks => {
      const newTasks = { ...prevTasks };

      // Удаляем из начальной колонки
      newTasks[startColumnKey] = startColumnTasks;

      // Обновляем статус задачи ЛОКАЛЬНО перед добавлением в новую колонку
      const updatedMovedTask = { ...movedTask, status: finishColumnKey };

      // Добавляем в конечную колонку
      const finishColumnTasks = Array.from(newTasks[finishColumnKey] || []);
      finishColumnTasks.splice(destination.index, 0, updatedMovedTask);
      newTasks[finishColumnKey] = finishColumnTasks;

      return newTasks;
    });

    // Отправляем запрос на API, только если статус действительно изменился
    if (originalTaskStatus !== finishColumnKey) {
      api.patch(`/api/tasks/${draggableId}/`, { status: finishColumnKey })
        .then(response => {
          console.log('Task updated successfully on API:', response.data);
          taskSuccessfullyUpdatedOnApi = true;
          // Опционально: можно обновить данные задачи в tasksByStatus из response.data,
          // если API возвращает полный обновленный объект задачи.
          // Это полезно, если на сервере могут происходить доп. изменения (например, timestamp обновления).
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

          // ОТКАТ ИЗМЕНЕНИЙ В UI:
          // Возвращаем задачу в исходную колонку с исходным статусом
          // Это простой вариант отката. Более сложный мог бы запоминать все состояние tasksByStatus.
          setTasksByStatus(prevTasks => {
            const revertedTasks = { ...prevTasks };

            // Убираем из (возможно) ошибочно обновленной конечной колонки
            const currentFinishTasks = Array.from(revertedTasks[finishColumnKey] || []);
            revertedTasks[finishColumnKey] = currentFinishTasks.filter(task => task.id.toString() !== draggableId);

            // Возвращаем в начальную колонку
            const currentStartTasks = Array.from(revertedTasks[startColumnKey] || []);
            // Восстанавливаем оригинальный статус перед возвратом
            const taskToRevert = { ...movedTask, status: originalTaskStatus }; 
            currentStartTasks.splice(source.index, 0, taskToRevert);
            revertedTasks[startColumnKey] = currentStartTasks;

            return revertedTasks;
          });
          // Можно также вызвать fetchTasks() для полной синхронизации, но откат более быстрый для UI.
        });
    } else {
      // Если задача перемещена внутри той же колонки (изменился только порядок)
      // TODO: Если ваш API поддерживает обновление порядка, отправьте запрос здесь.
      // api.patch(`/api/tasks/${draggableId}/order/`, { new_order_index: destination.index })
      //   .then(response => console.log('Task order updated:', response.data))
      //   .catch(err => console.error('Failed to update task order:', err));
      console.log('Task moved within the same column. Order update API call can be added here if needed.');
    }
  };

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
      <DragDropContext onDragEnd={onDragEndHandler}>
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
          {orderedStatuses.map((statusKey) => (
            <Droppable key={statusKey} droppableId={statusKey} type="TASK">
              {(provided, snapshot) => (
                <Paper 
                  ref={provided.innerRef} // Привязываем ref от Droppable к Paper
                  {...provided.droppableProps} // Применяем props от Droppable к Paper
                  elevation={3} 
                  sx={{ 
                    width: '200px', // Чуть шире, чтобы убрать возможный гор. скролл
                    flexShrink: 0,
                    height: '100%',      // Явно занять всю высоту родителя
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',  // Paper сама не скроллится
                    backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper', // Подсветка при перетаскивании НАД колонкой
                    transition: 'background-color 0.2s ease',
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
                    '&::-webkit-scrollbar': { display: 'none' }, // Chrome, Safari, Edge
                    msOverflowStyle: 'none', // IE
                    scrollbarWidth: 'none', // Firefox
                  }}>
                    {/* Inner Box for card list styling (padding, gap) */}
                    <Box sx={{
                      p: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}>
                      {(tasksByStatus[statusKey] || []).map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(providedDraggable, snapshotDraggable) => (
                            <TaskCard
                              task={task}
                              provided={providedDraggable}
                              isDragging={snapshotDraggable.isDragging}
                              showInteractionButtons={false} // <--- Вот это изменение
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder} {/* Важно для корректной работы Droppable */} 
                      {(tasksByStatus[statusKey] === undefined || tasksByStatus[statusKey]?.length === 0) && !provided.placeholder && (
                        <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Нет задач</Typography>
                      )}
                    </Box>
                  </Box>
                </Paper>
              )}
            </Droppable>
          ))}
        </Box>
      </DragDropContext>
    </Container>
  );
};

export default MyTasksKanbanPage;
