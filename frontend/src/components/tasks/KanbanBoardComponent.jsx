import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard'; // Предполагаем, что TaskCard в той же директории или путь корректен

// Эта функция будет отвечать за стилизацию заголовков столбцов
// Её нужно будет передать из TasksKanbanPage или определить здесь, если она не зависит от внешнего состояния
// const getColumnHeaderStyling = (statusKey) => { /* ... */ };

// Эта функция для получения читаемого названия статуса
// Её также нужно будет передать или определить
// const getStatusLabel = (statusKey) => { /* ... */ };


const KanbanBoardComponent = ({
  columns,
  columnOrder,
  onDragEnd,
  onTaskUpdate,
  getColumnHeaderStyling, // Пропс для функции стилизации
  getStatusLabel,         // Пропс для функции получения метки статуса
}) => {
  if (!columns || Object.keys(columns).length === 0) {
    // Можно добавить более информативное сообщение или индикатор загрузки, если это применимо
    return <Typography>Нет данных для отображения доски.</Typography>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Grid container spacing={2} sx={{ p: 1, overflowX: 'auto', flexWrap: 'nowrap', height: '100%' }}>
        {columnOrder.map((statusKey) => {
          const tasks = columns[statusKey] || []; // Новая логика: tasks - это непосредственно массив для данного statusKey
          const headerStyling = getColumnHeaderStyling(statusKey);

          return (
            <Grid item key={statusKey} sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Paper
                elevation={2}
                sx={{
                  p: 0.2,
                  mb: 0.5,
                  ...headerStyling, // Применяем стили заголовка
                  textAlign: 'center',
                }}
              >
                <Typography variant="h8" component="div">
                  {getStatusLabel(statusKey)} ({tasks.length})
                </Typography>
              </Paper>
              <Droppable droppableId={statusKey} type="TASK">
                {(provided, snapshot) => (
                  <Paper
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    elevation={1}
                    sx={{
                      flexGrow: 1,
                      p: 1,
                      minHeight: 0, 
                      overflowY: 'auto',
                      backgroundColor: statusKey === 'not_accepted'
                                      ? 'rgba(150, 1, 1, 0.09)'
                                      : (snapshot.isDraggingOver ? 'action.hover' : 'background.default'),
                      transition: 'background-color 0.2s ease',
                      // Стили для скрытия скроллбара
                      '&::-webkit-scrollbar': {
                        display: 'none',
                      },
                      msOverflowStyle: 'none',  // IE 10+
                      scrollbarWidth: 'none',   // Firefox
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                    }}
                  >
                    {tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index} isDragDisabled={statusKey === 'not_accepted'}>
                        {(providedDraggable, snapshotDraggable) => (
                          <Box
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            sx={{
                              mb: 1.5,
                              userSelect: 'none',
                              opacity: snapshotDraggable.isDragging ? 0.8 : 1,
                            }}
                          >
                            <TaskCard
                              task={task}
                              isDragging={snapshotDraggable.isDragging}
                              showInteractionButtons={false}
                              onTaskUpdate={onTaskUpdate}
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Paper>
                )}
              </Droppable>
            </Grid>
          );
        })}
      </Grid>
    </DragDropContext>
  );
};

export default KanbanBoardComponent;
