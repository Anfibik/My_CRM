import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
         Select, MenuItem, FormControl, InputLabel, Box, Checkbox, FormControlLabel } from '@mui/material';

// Helper functions
const formatDateTimeLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayString = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${dayString}T${hours}:${minutes}`;
};

const calculateTomorrow1730 = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(17, 30, 0, 0);
  return formatDateTimeLocal(tomorrow);
};

const calculateDeadlineByAddingWorkHours = (hoursToAdd) => {
  if (hoursToAdd <= 0) {
    return new Date(); // Return current time if no hours to add or invalid input
  }

  let deadlineDate = new Date(); // Current time with minutes
  const targetWorkingMinutesToAdd = hoursToAdd * 60;
  let actualWorkingMinutesAdded = 0;

  while (actualWorkingMinutesAdded < targetWorkingMinutesToAdd) {
    // Advance date by one minute
    deadlineDate.setMinutes(deadlineDate.getMinutes() + 1);

    const dayOfWeek = deadlineDate.getDay(); // 0 (Sun) to 6 (Sat)
    const hourOfDay = deadlineDate.getHours(); // 0 to 23

    // Check if the current minute is a working minute
    // Working hours: Mon-Fri, 9:00:00 to 17:59:59 inclusive
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hourOfDay >= 9 && hourOfDay < 18) {
      actualWorkingMinutesAdded++;
    }
  }
  // After the loop, deadlineDate points to the end of the last added working minute
  return deadlineDate;
};

const TaskModal = ({ open, onClose, onSubmit, users }) => {
  const initialTaskState = {
    title: '',
    task_type: 'universal',
    priority: 'low',
    deadline: calculateTomorrow1730(), 
    executor: '',
    participants: [],
    observers: []
  };
  const [taskData, setTaskData] = useState(initialTaskState);
  const [isCritical, setIsCritical] = useState(false);
  
  // Состояние для выбранного варианта дедлайна в выпадающем меню
  const [deadlineOption, setDeadlineOption] = useState('tomorrow');

  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [description, setDescription] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleCriticalChange = (event) => {
    const checked = event.target.checked;
    setIsCritical(checked);

    if (checked) {
      const newDeadlineDate = calculateDeadlineByAddingWorkHours(2);
      const formattedDeadline = formatDateTimeLocal(newDeadlineDate);
      setTaskData(prev => ({
        ...prev,
        priority: 'high',
        deadline: formattedDeadline,
      }));
      setDeadlineOption('manual'); // To show the TextField, which will be disabled
    } else {
      setTaskData(prev => ({
        ...prev,
        priority: 'low',
        deadline: calculateTomorrow1730(), // Revert to default
      }));
      setDeadlineOption('tomorrow'); // Revert option
    }
  };

  // Функция для обработки выбора варианта дедлайна из выпадающего меню
  const handleDeadlineOptionChange = (e) => {
    const option = e.target.value;
    setDeadlineOption(option);
    
    // Расчёт нового дедлайна в зависимости от выбранной опции
    let newDeadline = new Date();
    
    switch(option) {
      case 'twoHours':
        // Текущее время + 2 часа
        newDeadline.setHours(newDeadline.getHours() + 2);
        break;
        
      case 'today':
        // Сегодня до 17:30
        newDeadline.setHours(17, 30, 0, 0);
        break;
        
      case 'tomorrow':
        // Завтра до 17:30
        newDeadline.setDate(newDeadline.getDate() + 1);
        newDeadline.setHours(17, 30, 0, 0);
        break;
        
      case 'thisWeek':
        // До пятницы этой недели до 17:00
        const dayOfWeek = newDeadline.getDay(); // 0 (вс) - 6 (сб)
        const daysUntilFriday = dayOfWeek >= 5 ? 5 + 7 - dayOfWeek : 5 - dayOfWeek;
        newDeadline.setDate(newDeadline.getDate() + daysUntilFriday);
        newDeadline.setHours(17, 0, 0, 0);
        break;
        
      case 'manual':
        // При выборе ручного режима не меняем дедлайн
        return;
    }
    
    // Корректно форматируем дату и время для ввода в HTML5 input datetime-local
    // с учетом местного часового пояса
    const year = newDeadline.getFullYear();
    const month = String(newDeadline.getMonth() + 1).padStart(2, '0');
    const day = String(newDeadline.getDate()).padStart(2, '0');
    const hours = String(newDeadline.getHours()).padStart(2, '0');
    const minutes = String(newDeadline.getMinutes()).padStart(2, '0');
    
    const formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Обновляем дедлайн в состоянии
    setTaskData(prev => ({ 
      ...prev, 
      deadline: formattedDeadline
    }));
  };
  
  // Функция для прямого изменения даты (при ручном выборе)
  const handleDeadlineChange = (e) => {
    setTaskData(prev => ({ ...prev, deadline: e.target.value }));
  };

  const handleNextStep = () => {
    setDescriptionOpen(true);
  };

  const handleSubmit = () => {
    // Convert deadline to UTC ISO string before submitting
    const deadlineDate = new Date(taskData.deadline); // taskData.deadline is local "YYYY-MM-DDTHH:mm"
    const submissionData = {
      ...taskData,
      deadline: deadlineDate.toISOString(), // Converts to UTC string "YYYY-MM-DDTHH:mm:ss.sssZ"
      description,
    };
    onSubmit(submissionData);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    // Создаем дату на завтра в 17:30
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 30, 0, 0);
    
    // Форматируем дату для input datetime-local
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    const formattedDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;

    setTaskData({
      ...initialTaskState,
      deadline: formattedDeadline,
    });
    setDeadlineOption('tomorrow');
    setDescriptionOpen(false);
    setDescription('');
    setIsCritical(false);
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
              <InputLabel id="task-type-label">Тип задачи</InputLabel>
              <Select
                labelId="task-type-label"
                id="task_type"
                name="task_type"
                value={taskData.task_type}
                label="Тип задачи"
                onChange={handleChange}
              >
                <MenuItem value="approval">Согласование</MenuItem>
                <MenuItem value="payment">Оплата</MenuItem>
                <MenuItem value="delivery">Доставка</MenuItem>
                <MenuItem value="universal">Универсальная</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox 
                  checked={isCritical}
                  onChange={handleCriticalChange}
                  name="criticalImportance"
                  color="primary"
                />
              }
              label="Критично важно!!!"
              sx={{ mt: 1, mb: 0.5 }} 
            />

            <FormControl fullWidth>
              <InputLabel id="deadline-option-label">Дедлайн (опция)</InputLabel>
              <Select
                labelId="deadline-option-label"
                id="deadlineOption"
                name="deadlineOption"
                value={deadlineOption}
                onChange={handleDeadlineOptionChange}
                label="Дедлайн (опция)"
                disabled={isCritical} // Disable if critical
              >
                <MenuItem value="twoHours">+2 часа</MenuItem>
                <MenuItem value="today">Сегодня (до 17:30)</MenuItem>
                <MenuItem value="tomorrow">Завтра (до 17:30)</MenuItem>
                <MenuItem value="thisWeek">Эта неделя (до пятницы 17:00)</MenuItem>
                <MenuItem value="manual">В ручную (выбрать дату и время)</MenuItem>
              </Select>
            </FormControl>
            
            {/* Показываем календарь только если выбрана опция "В ручную" */}
            {deadlineOption === 'manual' && (
              <TextField
                label="Выберите дату и время"
                type="datetime-local"
                name="deadline"
                value={taskData.deadline}
                onChange={handleDeadlineChange}
                fullWidth
                sx={{ mt: 2 }}
                InputLabelProps={{
                  shrink: true,
                }}
                disabled={isCritical} // Disable if critical
              />
            )}

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
                    'low': 'Стандартный',
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
