import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Tooltip, Divider, Button, CircularProgress, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../api/config';
import { getDeadlineInfo } from '../../utils/deadlineUtils.js';
import { useNavigate } from 'react-router-dom';
import WarningIcon from '@mui/icons-material/Warning';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DEPARTMENT_LABELS } from '../../constants';
import {
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getTaskTypeLabel
} from '../../utils/taskUtils.js';

const TaskCard = ({ task, provided, isDragging = false, showInteractionButtons = true, onTaskUpdate }) => {
  const navigate = useNavigate();
  const [isCreateDateHovered, setIsCreateDateHovered] = useState(false);
  const [isDeadlineHovered, setIsDeadlineHovered] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const isDraggable = !!provided;

  const draggingStyle = isDraggable && isDragging ? {
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
  } : {};

  const handleTaskTypeClick = (e) => {
    if (isDraggable) {
      e.stopPropagation();
    }
    navigate(`/tasks/${task.id}`);
  };

  const isTaskClosed = task.status === 'closed';

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    };
    return date.toLocaleDateString('ru-RU', options);
  };

  const handleAcceptTask = async (e) => {
    e.stopPropagation();
    if (isAccepting || !task?.id) return;

    setIsAccepting(true);
    try {
      await api.patch(`/api/tasks/${task.id}/`, { status: 'accepted' });
      console.log(`Task ${task.id} status changed to accepted.`);
      if (onTaskUpdate) onTaskUpdate(task.id, { ...task, status: 'accepted' });
    } catch (err) {
      console.error(`Error updating task ${task.id} to accepted:`, err);
    } finally {
      setIsAccepting(false);
      setIsCreateDateHovered(false);
    }
  };

  const handleCompleteTask = async (e) => {
    e.stopPropagation();
    if (isCompleting || !task?.id) return;

    setIsCompleting(true);
    try {
      await api.patch(`/api/tasks/${task.id}/`, { status: 'completed' });
      console.log(`Task ${task.id} status changed to completed.`);
      if (onTaskUpdate) onTaskUpdate(task.id, { ...task, status: 'completed' });
    } catch (err) {
      console.error(`Error updating task ${task.id} to completed:`, err);
    } finally {
      setIsCompleting(false);
      setIsDeadlineHovered(false);
    }
  };

  return (
    <Card
      ref={isDraggable ? provided.innerRef : null}
      {...(isDraggable ? provided.draggableProps : {})}
      {...(isDraggable ? provided.dragHandleProps : {})}
      sx={{
        height: '150px',
        width: '170px',
        cursor: isDraggable ? 'grab' : 'pointer',
        border: task.priority === 'high' ? '3px solid' : 'none',
        borderColor: task.priority === 'high' ? 'error.main' : undefined,
        backgroundColor: 'rgba(237, 237, 237, 0.8)',
        '&:hover': {
          boxShadow: 4
        },
        ...draggingStyle,
        ...(isTaskClosed && {
          opacity: 0.6,
          backgroundColor: 'rgba(162, 162, 162, 0.83)',
        }),
      }}
      onClick={!isDraggable ? () => navigate(`/tasks/${task.id}`) : undefined}
    >
      <CardContent sx={{ padding: 0.5, '&:last-child': { pb: 0 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, width: '100%' }}>
          <Tooltip title={getStatusLabel(task.status)} placement="top">
            {getStatusIcon(task.status) ? React.cloneElement(getStatusIcon(task.status), {
              sx: {
                color: getStatusColor(task.status),
                ...(isTaskClosed && { opacity: 0.7 })
              }
            }) : null}
          </Tooltip>

          <Typography
            variant="caption"
            onClick={handleTaskTypeClick}
            sx={{
              flexGrow: 1,
              textAlign: 'center',
              mx: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.75rem',
              lineHeight: '1.2',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            {getTaskTypeLabel(task.task_type)}
          </Typography>

          {(() => {
            const deadlineInfo = getDeadlineInfo(task.deadline);
            if (deadlineInfo.iconName === 'Warning' && deadlineInfo.remainingHours === 0 && new Date(task.deadline) < new Date()) {
              return (
                <Tooltip title={deadlineInfo.text} placement="top">
                  <WarningIcon sx={{
                    color: deadlineInfo.color,
                    fontSize: '1rem',
                    ...(isTaskClosed && { opacity: 0.7 })
                  }} />
                </Tooltip>
              );
            } else {
              let displayText = deadlineInfo.text;
              if (typeof displayText === 'string' && displayText.startsWith("Осталось ")) {
                displayText = displayText.substring("Осталось ".length);
              }
              return (
                <Typography
                  variant="caption"
                  sx={{
                    color: deadlineInfo.color,
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    minWidth: '45px',
                    px: 0.5,
                  }}
                >
                  {displayText}
                </Typography>
              );
            }
          })()}
        </Box>

        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Авт.:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                pl: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={task.author_details?.full_name || 'Не указан'}
            >
              {task.author_details?.full_name || 'Не указан'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Исп.:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                pl: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={task.executor_details?.full_name || 'Не назначен'}
            >
              {task.executor_details?.full_name || 'Не назначен'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Деп.:
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                pl: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={DEPARTMENT_LABELS[task.executor_details.department]}
            >
              {DEPARTMENT_LABELS[task.executor_details.department]}
            </Typography>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mt: 0.5,
          pt: 0.5,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          fontSize: '0.6rem',
          color: isTaskClosed ? 'text.disabled' : 'text.secondary',
        }}
        >
          <Box
            sx={{
              flexBasis: '45%',
              textAlign: 'left',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              minHeight: '24px',
            }}
            onMouseEnter={() => setIsCreateDateHovered(true)}
            onMouseLeave={() => setIsCreateDateHovered(false)}
          >
            {showInteractionButtons && isCreateDateHovered && !isTaskClosed && task.status !== 'accepted' && task.status !== 'in_progress'
              && task.status !== 'completed' && task.status !== 'closed' ? (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleAcceptTask}
                disabled={isAccepting}
                sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative' }}
              >
                {isAccepting ? <CircularProgress size={12} sx={{ color: 'secondary.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'Принять'}
              </Button>
            ) : (
              <Tooltip title={`Создана: ${formatDateTime(task.created_at)}`} placement="bottom-start">
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatDateTime(task.created_at)}
                </Typography>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ flexBasis: '10%', textAlign: 'center' }}>
            <Tooltip
              title={
                <React.Fragment>
                  <Typography color="inherit" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}>
                    {task.title}
                  </Typography>
                  {task.description && <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />}
                  <Typography variant="body2" sx={{ textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                    {task.description || "Описание отсутствует."}
                  </Typography>
                </React.Fragment>
              }
              placement="top"
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    maxWidth: 300,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 3,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                },
                arrow: {
                  sx: {
                    color: 'background.paper',
                    '&::before': {
                      border: '1px solid',
                      borderColor: 'divider',
                    },
                  },
                },
              }}
            >
              <InfoOutlinedIcon sx={{
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: isTaskClosed ? 'text.disabled' : 'action.active',
                '&:hover': { color: 'primary.main' }
              }} />
            </Tooltip>
          </Box>

          <Box
            sx={{
              flexBasis: '45%',
              textAlign: 'right',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              minHeight: '24px',
            }}
            onMouseEnter={() => setIsDeadlineHovered(true)}
            onMouseLeave={() => setIsDeadlineHovered(false)}
          >
            {showInteractionButtons && isDeadlineHovered && !isTaskClosed && (task.status === 'accepted' || task.status === 'in_progress') ? (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={handleCompleteTask}
                disabled={isCompleting}
                sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative' }}
              >
                {isCompleting ? <CircularProgress size={12} sx={{ color: 'success.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'Завершить'}
              </Button>
            ) : (
              <Tooltip title={`Дедлайн: ${formatDateTime(task.deadline)}`} placement="bottom-end">
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatDateTime(task.deadline)}
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.7rem', textAlign: 'left', px: 0.5, minHeight: '20px' /* Чтобы блок не исчезал, если сделки нет, но занимал место */ }}>
          {task.deal && task.deal_details?.name ? (
            <Typography variant="caption" component="div" sx={{ fontSize: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
             
              <MuiLink 
                component={RouterLink} 
                to={`/deals/${task.deal}`} 
                variant="caption"
                sx={{ 
                  fontSize: 'inherit', 
                  fontWeight: 'normal',
                  textDecoration: 'none',
                  color: 'text.primary',
                  '&:hover': { 
                    textDecoration: 'underline',
                    color: 'text.primary',
                  } 
                }}
              >
                {task.deal_details.name}
              </MuiLink>
            </Typography>
          ) : (
            <Typography variant="caption" component="div" sx={{ fontSize: 'inherit', color: 'text.disabled' }}>
              Сделка: -
            </Typography>
          ) }
        </Box>

      </CardContent>
    </Card>
  );
};

export default TaskCard;
