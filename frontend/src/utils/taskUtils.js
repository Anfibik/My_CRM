import React from 'react';
import { 
    STATUS_LABELS, 
    PRIORITY_LABELS, 
    TASK_TYPE_LABELS,
} from '../constants'; 

// Иконки для статусов
import CancelIcon from '@mui/icons-material/Cancel';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ConstructionIcon from '@mui/icons-material/Construction';
import DoneIcon from '@mui/icons-material/Done';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || 'Неизвестно';
};

export const STATUS_COLORS_MAP = { 
    not_accepted: 'error.main',
    pending: 'warning.main',
    accepted: 'info.main',
    in_progress: 'primary.main',
    completed: 'success.main',
    closed: 'text.secondary', 
};

export const getStatusColor = (status) => {
  return STATUS_COLORS_MAP[status] || 'default';
};

export const getStatusIcon = (status) => {
  const icons = {
    'not_accepted': <CancelIcon fontSize="small" />,
    'pending': <PauseCircleOutlineIcon fontSize="small" />,
    'accepted': <CheckCircleOutlineIcon fontSize="small" />,
    'in_progress': <ConstructionIcon fontSize="small" />,
    'completed': <DoneIcon fontSize="small" />,
    'closed': <LockOutlinedIcon fontSize="small" />
  };
  return icons[status] || null;
};

export const getPriorityLabel = (priority) => {
  return PRIORITY_LABELS[priority] || 'Неизвестный';
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'inherit',
    high: 'error.main', 
  };
  return colors[priority] || 'inherit';
};

export const getTaskTypeLabel = (taskType) => {
  return TASK_TYPE_LABELS[taskType] || 'Неизвестный тип';
};
