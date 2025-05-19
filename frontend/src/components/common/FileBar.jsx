import React from 'react';
import { Box } from '@mui/material';

const FileBar = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <aside className="p-2">
        <h3 className="font-semibold mb-2">Файлы</h3>
        <p>Здесь будут прикреплённые документы, фото, и т.д.</p>
      </aside>
    </Box>
  );
};

export default FileBar;
