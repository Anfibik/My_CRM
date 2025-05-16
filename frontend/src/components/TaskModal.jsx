import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
         Select, MenuItem, FormControl, InputLabel, Box, Checkbox, FormControlLabel } from '@mui/material';
import { TASK_TYPE_LABELS, PRIORITY_LABELS, TASK_TYPE_OPTIONS } from '../constants';

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
    
    let newDeadlineDate; // Changed variable name for clarity
    
    switch(option) {
      case 'twoHours':
        newDeadlineDate = calculateDeadlineByAddingWorkHours(2); // Unified logic
        break;
        
      case 'today':
        newDeadlineDate = new Date();
        newDeadlineDate.setHours(17, 30, 0, 0);
        break;
        
      case 'tomorrow':
        newDeadlineDate = new Date(calculateTomorrow1730());
        break;

      case 'manual':
        // If 'manual' is chosen, don't change the deadline here.
        // It's either set by critical checkbox or manually input.
        // If user just selected 'manual' from dropdown, we might want to clear isCritical
        if (isCritical) {
            setIsCritical(false); // User is overriding critical via manual selection
            setTaskData(prev => ({ ...prev, priority: 'low' })); 
        }
        return; // Exit early, no automatic deadline change
      default:
        newDeadlineDate = new Date(calculateTomorrow1730()); // Default to tomorrow
    }

    setTaskData(prev => ({ ...prev, deadline: formatDateTimeLocal(newDeadlineDate) }));

    // If a specific deadline option (not 'manual' and not related to 'critical' logic) is chosen,
    // ensure critical status is turned off.
    if (option !== 'manual') { // 'manual' is handled above or by critical checkbox
        if (isCritical) {
            setIsCritical(false);
        }
        // Also, if the priority was 'high' due to critical, reset it, unless the new option implies high priority.
        // Current options ('twoHours', 'today', 'tomorrow') don't imply high priority.
        if (taskData.priority === 'high') {
            setTaskData(prev => ({ ...prev, priority: 'low' }));
        }
    }
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
              <InputLabel>Тип задачи</InputLabel>
              <Select
                name="task_type"
                value={taskData.task_type}
                onChange={handleChange}
                label="Тип задачи"
              >
                {TASK_TYPE_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
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
              <InputLabel>Дедлайн (опция)</InputLabel>
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
                <span><strong>Тип:</strong> {TASK_TYPE_LABELS[taskData.task_type] || taskData.task_type}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Приоритет:</strong> {PRIORITY_LABELS[taskData.priority] || taskData.priority}</span>
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
