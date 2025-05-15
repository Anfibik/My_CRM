import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, IconButton, Grid, Card, CardContent, Chip, CircularProgress, Divider, Tooltip } from '@mui/material';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DoneIcon from '@mui/icons-material/Done';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CancelIcon from '@mui/icons-material/Cancel';
import LoopIcon from '@mui/icons-material/Loop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ConstructionIcon from '@mui/icons-material/Construction';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';



// Настройка axios для работы с авторизацией

// 1. Настраиваем базовый URL
const API_BASE_URL = 'http://localhost:8000';
axios.defaults.baseURL = API_BASE_URL;

// 2. Включаем передачу куки в запросах
axios.defaults.withCredentials = true;

// 3. Проверяем JWT токен в localStorage или сессии
const jwtToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
if (jwtToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
  console.log('Найден JWT токен, добавлен в заголовки');
}

// 4. Проверяем токен DRF в localStorage
const drfToken = localStorage.getItem('token');
if (drfToken) {
  axios.defaults.headers.common['Authorization'] = `Token ${drfToken}`;
  console.log('Найден DRF токен, добавлен в заголовки');
}

// 5. Добавляем CSRF токен
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie('csrftoken');
if (csrftoken) {
  axios.defaults.headers.common['X-CSRFToken'] = csrftoken;
  console.log('CSRF токен добавлен в заголовки');
} else {
  console.warn('CSRF токен не найден в cookies');
}

console.log('Настройка авторизации axios завершена');

// Ленивая загрузка модального окна, чтобы избежать циклических зависимостей
const TaskModal = lazy(() => import('./TaskModal'));

const TASK_TYPE_LABELS = {
  "approval": "Согласование",
  "payment": "Оплата",
  "delivery": "Доставка",
  "universal": "Универсальная",
};

const getTaskTypeLabel = (taskType) => {
  return TASK_TYPE_LABELS[taskType] || taskType; // Fallback to raw type if not found
};

// Copied and modified from TaskDetail.jsx to get remaining working hours
const getRemainingWorkHours = (deadlineString) => {
  if (!deadlineString) return Infinity; // No deadline, consider it far away

  const now = new Date();
  const deadline = new Date(deadlineString);

  if (deadline < now) return 0; // Deadline passed

  let remainingHours = 0;
  let currentDate = new Date(now);
  currentDate.setMinutes(0, 0, 0);
  currentDate.setHours(currentDate.getHours() + 1);

  // Count full working hour slots that start from `currentDate` and before `deadline`.
  while (currentDate <= deadline) { 
    const dayOfWeek = currentDate.getDay();
    const hours = currentDate.getHours(); // This is the START of the 1-hour slot.
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && hours >= 9 && hours < 18) {
      remainingHours++;
    }
    currentDate.setHours(currentDate.getHours() + 1);
  }
  return remainingHours;
};

const getDeadlineDisplayInfo = (deadlineString) => {
  if (!deadlineString) {
    return {
      text: 'Дедлайн не указан',
      icon: <AccessTimeIcon fontSize="small" />,
      color: 'grey.500'
    };
  }

  const hours = getRemainingWorkHours(deadlineString);

  if (hours === 0 && new Date(deadlineString) < new Date()) { // Explicitly check if deadline passed
    return {
      text: 'Просрочено',
      icon: <AccessTimeIcon fontSize="small" />,
      color: 'error.main'
    };
  }
  if (hours <= 2) {
    return {
      text: `Осталось ${hours} ч`,
      icon: <AccessTimeIcon fontSize="small" />,
      color: 'error.main'
    };
  }
  if (hours <= 10) {
    return {
      text: `Осталось ${hours} ч`,
      icon: <AccessTimeIcon fontSize="small" />,
      color: 'warning.main' // orange
    };
  }
  return {
    text: `Осталось ${hours} ч`,
    icon: <AccessTimeIcon fontSize="small" />,
    color: 'grey.500'
  };
};

const TasksArea = ({ deal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загружаем задачи для текущей сделки
  useEffect(() => {
    if (deal?.id) {
      setIsLoading(true);
      axios.get(`/api/tasks/?deal=${deal.id}`)
        .then(response => {
          setTasks(response.data.results || response.data);
          setError(null);
        })
        .catch(err => {
          console.error("Error fetching tasks:", err);
          setError("Не удалось загрузить задачи");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [deal]);

  // Загружаем текущего пользователя и список всех пользователей для выбора в модальном окне
  const [currentUser, setCurrentUser] = useState(null);

  // Загрузка текущего пользователя
  useEffect(() => {
    console.log('Попытка загрузить текущего пользователя...');
    axios.get('/api/auth/me', { withCredentials: true })
      .then(response => {
        console.log('Текущий пользователь загружен:', response.data);
        setCurrentUser(response.data);
      })
      .catch(err => {
        console.error("Ошибка загрузки текущего пользователя:", err);
      });
  }, []);

  // Загрузка всех пользователей
  useEffect(() => {
    console.log('Попытка загрузить всех пользователей...');
    axios.get('/api/users/', { withCredentials: true })
      .then(response => {
        console.log('Ответ от API пользователей:', response);
        console.log('Данные API пользователей:', response.data);

        // Проверим, какой формат данных приходит (массив или с полем results)
        const allUsers = response.data.results || response.data;
        console.log('Извлеченные пользователи:', allUsers);
        console.log('Количество пользователей:', allUsers.length);

        // Исключаем текущего пользователя если он загружен
        if (currentUser && currentUser.id) {
          console.log('Фильтрация пользователей, исключая ID:', currentUser.id);
          const filteredUsers = allUsers.filter(user => user.id !== currentUser.id);
          console.log('Отфильтрованные пользователи:', filteredUsers);
          console.log('Количество отфильтрованных пользователей:', filteredUsers.length);
          setUsers(filteredUsers);
        } else {
          console.log('Текущий пользователь не загружен, использую всех пользователей');
          setUsers(allUsers);
        }

        if (allUsers.length === 0) {
          console.warn("ВНИМАНИЕ: Не найдено ни одного пользователя в ответе");
        }
      })
      .catch(err => {
        console.error("Ошибка загрузки пользователей:", err);
      });
  }, [currentUser]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCreateTask = (taskData) => {
    // Добавляем ID сделки к задаче
    const newTask = {
      ...taskData,
      deal: deal?.id
    };

    setIsLoading(true);
    axios.post('/api/tasks/', newTask)
      .then(response => {
        setTasks(prev => [response.data, ...prev]);
        setError(null);
      })
      .catch(err => {
        console.error("Error creating task:", err);
        setError("Не удалось создать задачу");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Хелперы для отображения статуса и приоритета
  const getStatusColor = (status) => {
    const colors = {
      'not_accepted': 'error',
      'pending': 'warning',
      'accepted': 'secondary',
      'in_progress': 'primary',
      'completed': 'success',
      'closed': 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'not_accepted': 'Не принята',
      'pending': 'В ожидании',
      'accepted': 'Принята',
      'in_progress': 'В работе',
      'completed': 'Выполнена',
      'closed': 'Закрыта'
    };
    return labels[status] || 'Неизвестно';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'not_accepted': <CancelIcon fontSize="small" />,
      'pending': <PauseCircleOutlineIcon fontSize="small" />,
      'accepted': <CheckCircleOutlineIcon fontSize="small" />,
      'in_progress': <ConstructionIcon  fontSize="small" />,
      'completed': <DoneIcon fontSize="small" />,
      'closed': <LockOutlinedIcon fontSize="small" />
    };
    return icons[status] || null;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'action.active',
      'high': 'warning'
    };
    return colors[priority] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Планово',
      'high': 'Критично'
    };
    return labels[priority] || 'Неизвестно';
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'low': <LoopIcon fontSize="small" />,
      'high': <WarningAmberIcon fontSize="small" />
    };
    return icons[priority] || null;
  };

  return (
    <div className="p-2">
      <Box sx={{display: 'flex', alignItems: 'center' }}>

        <Box sx={{ mr: 2, alignItems: 'center' }}>
          <Typography variant="h6" component="h2">
            Задачи <IconButton
              color="primary"
              onClick={handleOpenModal}
              disabled={!deal?.id}
              aria-label="Добавить задачу"
            > <AddIcon />
            </IconButton>
          </Typography>
        </Box>
        
        <Box sx={{ mr: 2 }}>фильтр 1</Box>
        <Box sx={{ mr: 2 }}>фильтр 2</Box>
        <Box sx={{ mr: 2 }}>фильтр 3 </Box>

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
        <Grid container spacing={1}>
          {tasks.map(task => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
              <Card
                sx={{
                  height: '130px',
                  width: '150px',
                  cursor: 'pointer',
                  border: task.priority === 'high' ? '4px solid' : 'none',
                  borderColor: task.priority === 'high' ? 'error.main' : undefined,
                  backgroundColor: 'rgba(237, 237, 237, 0.8)', // Always light grey
                  '&:hover': {
                    boxShadow: 4
                  }
                }}
                onClick={() => window.location.href = `/tasks/${task.id}`}
              >
                <CardContent sx={{ padding: 0.5, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, width: '100%' }}>
                    <Tooltip title={getStatusLabel(task.status)} placement="top">
                      {React.cloneElement(getStatusIcon(task.status), { sx: { color: `${getStatusColor(task.status)}.main` } })}
                    </Tooltip>

                    <Tooltip title={getTaskTypeLabel(task.task_type)} placement="top">
                      <Typography
                        variant="caption"
                        sx={{
                          flexGrow: 1,
                          textAlign: 'center',
                          mx: 0, // Margin between icons and text
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.75rem', // Adjusted for fitting "Универсальная"
                          lineHeight: '1.2', // Adjust line height for small font
                        }}
                      >
                        {getTaskTypeLabel(task.task_type)}
                      </Typography>
                    </Tooltip>

                    {(() => {
                      const deadlineInfo = getDeadlineDisplayInfo(task.deadline);
                      return (
                        <Tooltip title={deadlineInfo.text} placement="top">
                          {React.cloneElement(deadlineInfo.icon, { sx: { color: deadlineInfo.color } })}
                        </Tooltip>
                      );
                    })()}
                  </Box>
                  <Typography variant="h6" noWrap title={task.title}>
                    {task.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          {deal?.id ? 'Задачи отсутствуют. Создайте первую задачу.' : 'Сначала выберите сделку.'}
        </Box>
      )}

      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress /></Box>}>
        {isModalOpen && (
          <TaskModal
            open={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleCreateTask}
            users={users}
            dealId={deal?.id}
          />
        )}
      </Suspense>
    </div>
  );
};

export default TasksArea;
