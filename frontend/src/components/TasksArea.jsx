import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, Chip, CircularProgress } from '@mui/material';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';

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
      'not_accepted': 'default',
      'pending': 'info',
      'accepted': 'secondary',
      'in_progress': 'primary',
      'completed': 'success',
      'closed': 'error'
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

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error'
    };
    return colors[priority] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return labels[priority] || 'Неизвестно';
  };

  return (
    <div className="mt-4 p-4 rounded shadow">
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          Задачи по сделке
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenModal}
          startIcon={<AddIcon />}
          disabled={!deal?.id}
        >
          Добавить задачу
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2, color: 'error.main' }}>
          {error}
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          Загрузка...
        </Box>
      ) : tasks.length > 0 ? (
        <Grid container spacing={2}>
          {tasks.map(task => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
                onClick={() => window.location.href = `/tasks/${task.id}`}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      ID: {task.id}
                    </Typography>
                    <Chip 
                      label={getStatusLabel(task.status)} 
                      color={getStatusColor(task.status)} 
                      size="small" 
                    />
                  </Box>
                  <Typography variant="h6" noWrap title={task.title}>
                    {task.title}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip 
                      label={getPriorityLabel(task.priority)} 
                      color={getPriorityColor(task.priority)} 
                      size="small" 
                      sx={{ mr: 0.5 }}
                    />
                  </Box>
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
