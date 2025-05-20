import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TaskFiltersComponent = () => {
  // Здесь будет логика и UI для фильтров
  // Например, фильтры по дате, исполнителю, приоритету и т.д.

  return (
    <Paper elevation={3} sx={{ p: 1, mb: 1 }}>
      <Box>
        <Box>
          <Box>
            Создана
            Дедлайн
          </Box>
          <Box>
            Сегодня
            Завтра
            Неделя
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default TaskFiltersComponent;
