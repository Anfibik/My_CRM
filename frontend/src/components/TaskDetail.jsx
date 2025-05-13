import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Divider, Chip, Button, Grid,
  Avatar, TextField, CircularProgress, IconButton, Tooltip,
  Card, CardContent, List, ListItem, ListItemText, Menu, MenuItem
} from '@mui/material';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Настройка axios для авторизации
axios.defaults.withCredentials = true;

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  
  // Состояние для управления выпадающим меню статусов
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const statusMenuOpen = Boolean(statusAnchorEl);

  // Загрузка данных задачи
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tasks/${id}/`, { withCredentials: true });
        setTask(response.data);
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке задачи:', err);
        setError('Не удалось загрузить данные задачи');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  // Обработчики действий
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await axios.post('/api/task-discussions/', {
        task: id,
        content: newComment,
      }, { withCredentials: true });

      // Добавляем новый комментарий к списку без перезагрузки всей задачи
      setTask(prev => ({
        ...prev,
        discussions: [response.data, ...(prev.discussions || [])],
      }));

      setNewComment('');
    } catch (err) {
      console.error('Ошибка при отправке комментария:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setChangingStatus(true);
      const response = await axios.patch(`/api/tasks/${id}/`, {
        status: newStatus
      }, { withCredentials: true });

      setTask(prev => ({
        ...prev,
        status: response.data.status
      }));
    } catch (err) {
      console.error('Ошибка при изменении статуса:', err);
    } finally {
      setChangingStatus(false);
      setStatusAnchorEl(null); // Закрываем меню после изменения статуса
    }
  };
  
  // Обработчики для выпадающего меню статусов
  const handleStatusClick = (event) => {
    setStatusAnchorEl(event.currentTarget);
  };
  
  const handleStatusClose = () => {
    setStatusAnchorEl(null);
  };

  // Хелперы для отображения
  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTimeRemaining = (deadlineString) => {
    if (!deadlineString) return { text: '—', overdue: false };

    const now = new Date();
    const deadline = new Date(deadlineString);
    const diffMs = deadline - now;

    if (diffMs < 0) {
      // Уже просрочено
      const diffHours = Math.abs(Math.floor(diffMs / (1000 * 60 * 60)));
      return {
        text: `Просрочено на ${diffHours} ч`,
        overdue: true
      };
    } else {
      // Ещё не просрочено
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return {
        text: `${diffHours} ч`,
        overdue: false
      };
    }
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

  const getStatusColor = (status) => {
    // Для статуса закрыта возвращаем черный
    if (status === 'closed') {
      return 'grey'; // Темно-серый (сработает с .dark модификатором)
    }
    
    const colors = {
      'not_accepted': 'error',     // красный
      'pending': 'warning',        // оранжевый
      'accepted': 'secondary',     // фиолетовый (Material UI secondary color)
      'in_progress': 'primary',    // синий
      'completed': 'success',      // зеленый
    };
    return colors[status] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return labels[priority] || 'Неизвестно';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error'
    };
    return colors[priority] || 'default';
  };

  const getTaskTypeLabel = (type) => {
    const labels = {
      'bug': 'Ошибка',
      'feature': 'Улучшение',
      'task': 'Задача',
      'support': 'Поддержка',
      'documentation': 'Документация'
    };
    return labels[type] || 'Универсальная';
  };

  const getDepartmentLabel = (departmentCode) => {
    if (!departmentCode) return '';
    
    const departments = {
      'warehouses': 'ШМБ',
      'racks': 'Стеллажные системы',
      'warehouses_machines': 'Складская техника',
      'plastic_containers': 'Пластиковая тара',
      'trash_bins': 'Мусорные баки',
      'sorting_systems': 'Системы сортировки',
      'automation': 'Автоматизация',
      'services': 'Сервисные услуги',
      'administrations': 'Администрация',
      'logistics': 'Логистика',
      'finance': 'Финансы и бухгалтерия',
      'marketing': 'Маркетинг'
    };
    
    return departments[departmentCode] || departmentCode;
  };

  // Если данные загружаются, показываем индикатор загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Вернуться назад
        </Button>
      </Box>
    );
  }

  // Если данных нет, тоже показываем ошибку
  if (!task) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Задача не найдена</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Вернуться назад
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: '1200px', mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: 0, border: '1px solid #ccc', borderRadius: 2, overflow: 'hidden' }}>
        {/* Верхняя панель с основной информацией */}
        <Box sx={{ p: 1, display: 'flex', borderBottom: '1px solid #ccc', alignItems: 'center' }}>
          {/* Левый блок (20%) - даты */}
          <Box sx={{ width: '20%', pr: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Верхний блок - Создано (25%) */}
              <Box sx={{ mb: 0.5, height: '25%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    СОЗДАНО:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatDateTime(task?.created_at)}
                  </Typography>
                </Box>
              </Box>

              {/* Средний блок - Дедлайн (25%) */}
              <Box sx={{ mb: 0.5, height: '25%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    ДЕДЛАЙН:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {formatDateTime(task?.deadline)}
                  </Typography>
                </Box>
              </Box>

              {/* Нижний блок - Осталось (50%) */}
              <Box sx={{ height: '50%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    ОСТАЛОСЬ:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon
                      fontSize="small"
                      sx={{
                        mr: 0.5,
                        color: task?.deadline ? (calculateTimeRemaining(task.deadline).overdue ? 'error.main' : 'text.secondary') : 'text.secondary'
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color={task?.deadline ? (calculateTimeRemaining(task.deadline).overdue ? 'error.main' : 'text.secondary') : 'text.secondary'}
                    >
                      {task?.deadline ? calculateTimeRemaining(task.deadline).text : '—'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Блок для иконки дедлайна */}
          <Box sx={{ width: '7%', px: 1 }}>

          </Box>

          {/* Центральный блок (70%) - название и идентификатор */}
          <Box sx={{ width: '65%', px: 1 }}>
            <Box
              sx={{ 
                width: '100%',
                pb: 1,
                borderRadius: 3,
                border: '3px solid',
                borderColor: {
                  // Использовать конкретные цвета из цветовой схемы статусов
                  'not_accepted': '#f44336', // error - красный
                  'pending': '#ff9800',      // warning - оранжевый
                  'accepted': '#9c27b0',     // фиолетовый (был голубой)
                  'in_progress': '#2196f3',  // primary - синий
                  'completed': '#4caf50',    // success - зеленый
                  'closed': '#9e9e9e',       // default - серый
                }[task?.status] || '#9e9e9e',
                backgroundColor: '#f8f9fa'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  lineHeight: 1.3,
                  mb: 0.5,
                  color: '#2c3e50',
                  textAlign: 'center'
                }}
              >
                {task?.title}
              </Typography>
              
              <Box sx={{ 
                mt: 1.5, 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                color: '#455a64',
                fontSize: '0.95rem'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {task?.author_details?.full_name} ({getDepartmentLabel(task?.author_details?.department)})
                </Typography>
                
                <Box sx={{ 
                  mx: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  color: '#90a4ae'
                }}>
                  <Box sx={{ height: '2px', width: '30px', bgcolor: '#cfd8dc' }} />
                  <ArrowBackIcon sx={{ transform: 'rotate(180deg)', mx: 1, fontSize: '1.2rem' }} />
                  <Box sx={{ height: '2px', width: '30px', bgcolor: '#cfd8dc' }} />
                </Box>
                
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {task?.executor_details?.full_name} ({getDepartmentLabel(task?.executor_details?.department)})
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Правый блок (10%) - статус */}
          <Box sx={{ width: '10%', pl: 1 }}>
            <Box 
              sx={{ 
                width: '100%', 
                height: '40px',
                borderRadius: '20px',
                bgcolor: task?.status === 'closed' ? 'grey.700' : `${getStatusColor(task?.status)}.light`, 
                color: task?.status === 'closed' ? '#fff' : `${getStatusColor(task?.status)}.contrastText`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: changingStatus ? 'default' : 'pointer',
                opacity: changingStatus ? 0.7 : 1,
                transition: 'background-color 0.3s'
              }}
              onClick={changingStatus ? undefined : handleStatusClick}
            >
              <Typography 
                noWrap 
                sx={{ 
                  fontWeight: 'medium', 
                  fontSize: '0.875rem', 
                  px: 1,
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {getStatusLabel(task?.status)}
              </Typography>
            </Box>
            
            <Menu
              anchorEl={statusAnchorEl}
              open={statusMenuOpen}
              onClose={handleStatusClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { maxHeight: 300, overflow: 'auto' } }}
            >
              {[
                { value: 'not_accepted', label: 'Не принята' },
                { value: 'pending', label: 'В ожидании' },
                { value: 'accepted', label: 'Принята' },
                { value: 'in_progress', label: 'В работе' },
                { value: 'completed', label: 'Выполнена' },
                { value: 'closed', label: 'Закрыта' }
              ].map((status) => (
                <MenuItem
                  key={status.value}
                  onClick={() => handleChangeStatus(status.value)}
                  selected={task?.status === status.value}
                  disabled={task?.status === status.value || changingStatus}
                  sx={{ 
                    px: 2, 
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <Box sx={{ 
                    width: '100%', 
                    height: '28px',
                    borderRadius: '14px',
                    bgcolor: status.value === 'closed' ? 'grey.700' : `${getStatusColor(status.value)}.light`, 
                    color: status.value === 'closed' ? '#fff' : `${getStatusColor(status.value)}.contrastText`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Typography 
                      noWrap 
                      sx={{ 
                        fontWeight: 'medium', 
                        fontSize: '0.875rem', 
                        px: 1,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {status.label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>

        {/* Основное содержимое */}
        <Box sx={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
          {/* Левая колонка с информацией */}
          <Box sx={{ width: '320px', p: 2, borderRight: '1px solid #ccc', height: '100%', overflow: 'auto' }}>
            <Box sx={{ border: '1px dashed #999', p: 1, mb: 2 }}>
              <Typography variant="body2">Тип задачи</Typography>
            </Box>

            <Box sx={{ border: '1px dashed #999', p: 1, mb: 2 }}>
              <Typography variant="body2">Название сделки</Typography>
            </Box>

            {/* Информация об авторе */}
            <Box sx={{ border: '1px dashed #999', p: 1, mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">АВТОР</Typography>
              <Typography variant="body2">- имя</Typography>
              <Typography variant="body2">- роль</Typography>
              <Typography variant="body2">- департамент</Typography>
            </Box>

            {/* Информация об исполнителе */}
            <Box sx={{ border: '1px dashed #999', p: 1, mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">ИСПОЛНИТЕЛЬ</Typography>
              <Typography variant="body2">- имя</Typography>
              <Typography variant="body2">- роль</Typography>
              <Typography variant="body2">- департамент</Typography>
            </Box>

            {/* Участники */}
            <Box sx={{ border: '1px dashed #999', p: 1, mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">Участники</Typography>
              <Typography variant="body2">- Имя (департамент - роль)</Typography>
              <Typography variant="body2">- Имя (департамент - роль)</Typography>
              <Typography variant="body2">- ......</Typography>
            </Box>

            {/* Наблюдатели */}
            <Box sx={{ border: '1px dashed #999', p: 1 }}>
              <Typography variant="body2" fontWeight="bold">Наблюдатели</Typography>
              <Typography variant="body2">- Имя (департамент - роль)</Typography>
              <Typography variant="body2">- Имя (департамент - роль)</Typography>
              <Typography variant="body2">- ......</Typography>
            </Box>
          </Box>

          {/* Основная область контента */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Панель статусов справа */}
            <Box sx={{ position: 'absolute', right: 0, top: '100px', bottom: 0, width: '30px', bgcolor: '#f0f0f0', borderLeft: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
              <Typography sx={{ transform: 'rotate(90deg)', whiteSpace: 'nowrap', my: 5 }}>Статусы</Typography>
            </Box>

            {/* Описание задачи */}
            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', mr: '30px' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Форма заполнения, детализация, описание
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {task?.description || 'Описание отсутствует'}
              </Typography>
            </Box>

            {/* Обсуждение */}
            <Box sx={{ height: '200px', borderTop: '1px solid #ccc', p: 2, mr: '30px' }}>
              <Typography variant="h6" gutterBottom>
                Обсуждение
              </Typography>

              {task?.discussions?.length > 0 ? (
                <Box sx={{ maxHeight: '130px', overflowY: 'auto' }}>
                  {task.discussions.map(discussion => (
                    <Box key={discussion.id} sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold">
                        {discussion.author_details?.full_name || 'Пользователь'}:
                      </Typography>
                      <Typography variant="body2">
                        {discussion.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Нет комментариев к задаче
                </Typography>
              )}

              {/* Форма добавления комментария */}
              <Box sx={{ display: 'flex', mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Введите комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submittingComment}
                  sx={{ mr: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  Отправить
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Кнопка возврата */}
      <Box sx={{ mt: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Назад к списку задач
        </Button>
      </Box>
    </Box>
  );
};

export default TaskDetail;
