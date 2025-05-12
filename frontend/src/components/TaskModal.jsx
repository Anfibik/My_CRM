import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
         Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';

const TaskModal = ({ open, onClose, onSubmit, users }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    task_type: 'universal',
    priority: 'medium',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Завтра по умолчанию, формат для input type='datetime-local'
    executor: '',
    participants: [],
    observers: []
  });

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [description, setDescription] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeadlineChange = (e) => {
    setTaskData(prev => ({ ...prev, deadline: e.target.value }));
  };

  const handleNextStep = () => {
    setDescriptionOpen(true);
  };

  const handleSubmit = () => {
    onSubmit({ ...taskData, description });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTaskData({
      title: '',
      task_type: 'universal',
      priority: 'medium',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      executor: '',
      participants: [],
      observers: []
    });
    setDescription('');
    setDescriptionOpen(false);
  };

  const closeAll = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      {/* Первое модальное окно с основными полями */}
      <Dialog open={open && !descriptionOpen} onClose={closeAll} maxWidth="sm" fullWidth>
        <DialogTitle>Создание новой задачи</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
            <TextField
              label="Название задачи"
              name="title"
              value={taskData.title}
              onChange={handleChange}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Тип задачи</InputLabel>
              <Select
                name="task_type"
                value={taskData.task_type}
                onChange={handleChange}
                label="Тип задачи"
              >
                <MenuItem value="approval">Согласование</MenuItem>
                <MenuItem value="payment">Оплата</MenuItem>
                <MenuItem value="delivery">Доставка</MenuItem>
                <MenuItem value="universal">Универсальная</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Приоритет</InputLabel>
              <Select
                name="priority"
                value={taskData.priority}
                onChange={handleChange}
                label="Приоритет"
              >
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Дедлайн"
              type="datetime-local"
              name="deadline"
              value={taskData.deadline}
              onChange={handleDeadlineChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />

            <FormControl fullWidth error={!users || users.length === 0}>
              <InputLabel>Исполнитель *</InputLabel>
              <Select
                name="executor"
                value={taskData.executor}
                onChange={handleChange}
                label="Исполнитель *"
                required
              >
                {users && users.length > 0 ? users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name} ({user.department})
                  </MenuItem>
                )) : (
                  <MenuItem disabled value="">
                    Нет доступных пользователей для выбора
                  </MenuItem>
                )}
              </Select>
              {!users || users.length === 0 ? (
                <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                  Невозможно создать задачу без исполнителя
                </Box>
              ) : null}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Участники (опционально)</InputLabel>
              <Select
                name="participants"
                multiple
                value={taskData.participants}
                onChange={handleChange}
                label="Участники (опционально)"
              >
                {users && users.length > 0 ? users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name} ({user.department})
                  </MenuItem>
                )) : (
                  <MenuItem disabled value="">
                    Нет доступных пользователей для выбора
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Наблюдатели (опционально)</InputLabel>
              <Select
                name="observers"
                multiple
                value={taskData.observers}
                onChange={handleChange}
                label="Наблюдатели (опционально)"
              >
                {users && users.length > 0 ? users.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.full_name} ({user.department})
                  </MenuItem>
                )) : (
                  <MenuItem disabled value="">
                    Нет доступных пользователей для выбора
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAll}>Отмена</Button>
          <Button 
            onClick={handleNextStep} 
            variant="contained" 
            color="primary"
            disabled={!taskData.title || !taskData.executor}
          >
            Далее
          </Button>
        </DialogActions>
      </Dialog>

      {/* Второе модальное окно для описания задачи */}
      <Dialog open={descriptionOpen} onClose={() => setDescriptionOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Описание задачи</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Название:</strong> {taskData.title}</span>
                <span><strong>Тип:</strong> {
                  {
                    'approval': 'Согласование',
                    'payment': 'Оплата',
                    'delivery': 'Доставка',
                    'universal': 'Универсальная'
                  }[taskData.task_type]
                }</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Приоритет:</strong> {
                  {
                    'low': 'Низкий',
                    'medium': 'Средний',
                    'high': 'Высокий'
                  }[taskData.priority]
                }</span>
                <span><strong>Дедлайн:</strong> {new Date(taskData.deadline).toLocaleString('ru-RU')}</span>
              </Box>
              <Box>
                <strong>Исполнитель:</strong> {users && users.find(user => user.id === taskData.executor)?.full_name || 'Не назначен'}
              </Box>
            </Box>

            <TextField
              label="Описание задачи"
              multiline
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              placeholder="Введите подробное описание задачи..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionOpen(false)}>Назад</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={!description}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskModal;
