// frontend/src/components/common/InfoTooltipIcon.jsx
import React from 'react';
import { Tooltip, Typography, Divider } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const InfoTooltipIcon = ({ title, description }) => {
  // Если title не передан, компонент ничего не отобразит
  if (!title) {
    return null;
  }

  // Стандартизированные стили для иконки
  const iconStyles = {
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: 'action.active', // Стандартный активный цвет для иконок
    '&:hover': { color: 'primary.main' }, // Стандартный эффект при наведении
  };

  return (
    <Tooltip
      title={
        <React.Fragment>
          <Typography color="inherit" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}>
            {title}
          </Typography>
          {description && <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />}
          <Typography variant="body2" sx={{ textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
            {description || "Описание отсутствует."}
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
      <InfoOutlinedIcon sx={iconStyles} />
    </Tooltip>
  );
};

export default InfoTooltipIcon;
