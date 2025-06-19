import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Box, Typography, IconButton, Card, CardContent, Chip, CircularProgress, Divider, Tooltip, useTheme, Alert } from '@mui/material';
import api from '../../api/config'; // Импортируем наш экземпляр api
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoneIcon from '@mui/icons-material/Done';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import LoopIcon from '@mui/icons-material/Loop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ConstructionIcon from '@mui/icons-material/Construction';
import TaskModal from './TaskModal';
import TaskCard from './TaskCard.jsx';
import { STATUS_LABELS, TASK_TYPE_LABELS } from '../../constants'; // Import constants
import eventBus from '../../utils/eventBus'; // <-- Добавлен импорт eventBus

const TasksArea = ({
  deal,
  title = "Задачи",
  tasks = [],
  isLoading = false,
  error = null,
  onTaskUpdate,
  onTaskCreated,
  CardComponent = TaskCard,
  onCardClick = null,
  showAddTaskButton = true,
  titleVariant = 'h6',
  gridSpacing = 1,
  users = [],
  currentUser = null,
}) => {
  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleTaskCreated = (createdTask) => {
    if (onTaskCreated) {
      onTaskCreated(createdTask);
    }
    setIsModalOpen(false);
  };

  if (!deal && !isLoading) {
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1, boxShadow: 1, textAlign: 'center' }}>
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
    <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant={titleVariant} component="div" sx={{ mb: 0 }}>
          {title}
        </Typography>
        {showAddTaskButton && deal?.id && (
          <Tooltip title="Добавить задачу">
            <IconButton
              color="primary"
              onClick={handleOpenModal}
              size="small"
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
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            overflowY: 'hidden',
            mt: 0.5,
            pb: 1,
            gap: theme.spacing(gridSpacing),
          }}
        >
          {tasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                flexShrink: 0,
                pt: 0.5,
                pb: 0.5
              }}
            >
              <CardComponent
                task={task}
                onTaskUpdate={onTaskUpdate}
                {...(CardComponent.name === 'CompactTaskCard' && onCardClick ? { onClick: () => onCardClick(task) } : {})}
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {title.toLowerCase().includes('архив') ? 'Архив задач пуст.' : 'Задачи отсутствуют.'}
        </Box>
      )}

      {showAddTaskButton && deal?.id && (
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
