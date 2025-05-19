import React from 'react';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { getDeadlineInfo } from '../../utils/deadlineUtils.js';
import WarningIcon from '@mui/icons-material/Warning';
import { 
    getStatusLabel, 
    getStatusColor, 
    getStatusIcon, 
    getTaskTypeLabel
} from '../../utils/taskUtils.js';

const TaskCard = ({ task }) => {
  const handleCardClick = () => {
    window.location.href = `/tasks/${task.id}`;
  };

  return (
    <Card
      sx={{
        height: '130px',
        width: '172px',
        cursor: 'pointer',
        border: task.priority === 'high' ? '4px solid' : 'none',
        borderColor: task.priority === 'high' ? 'error.main' : undefined,
        backgroundColor: 'rgba(237, 237, 237, 0.8)', 
        '&:hover': {
          boxShadow: 4
        }
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ padding: 0.5, '&:last-child': { pb: 0 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, width: '100%' }}>
          <Tooltip title={getStatusLabel(task.status)} placement="top">
            {getStatusIcon(task.status) ? React.cloneElement(getStatusIcon(task.status), { sx: { color: getStatusColor(task.status) } }) : null}
          </Tooltip>

          <Tooltip title={getTaskTypeLabel(task.task_type)} placement="top">
            <Typography
              variant="caption"
              sx={{
                flexGrow: 1,
                textAlign: 'center',
                mx: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.75rem',
                lineHeight: '1.2',
              }}
            >
              {getTaskTypeLabel(task.task_type)}
            </Typography>
          </Tooltip>

          {(() => {
            const deadlineInfo = getDeadlineInfo(task.deadline);
            if (deadlineInfo.iconName === 'Warning' && deadlineInfo.remainingHours === 0 && new Date(task.deadline) < new Date()) {
              return (
                <Tooltip title={deadlineInfo.text} placement="top">
                  <WarningIcon sx={{ color: deadlineInfo.color, fontSize: '1rem' }} />
                </Tooltip>
              );
            } else {
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
                  {deadlineInfo.text}
                </Typography>
              );
            }
          })()}
        </Box>
        <Tooltip title={task.title} placement="top">
          <Typography
            variant="h6"
            sx={{
              fontSize: '0.7rem',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.title}
          </Typography>
        </Tooltip>
        
        <Box sx={{ mt: 0.5 }}>
          <Typography variant="caption" component="div" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
            Автор:
          </Typography>
          <Typography
            variant="caption"
            component="div"
            sx={{ fontSize: '0.6rem', pl: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={task.author_details?.full_name || 'Не указан'}
          >
            {task.author_details?.full_name || 'Не указан'}
          </Typography>
          
          <Typography variant="caption" component="div" sx={{ fontSize: '0.6rem', fontWeight: 'bold', mt: 0.25 }}>
            Исполнитель:
          </Typography>
          <Typography
            variant="caption"
            component="div"
            sx={{ fontSize: '0.6rem', pl: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={task.executor_details?.full_name || 'Не назначен'}
          >
            {task.executor_details?.full_name || 'Не назначен'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
