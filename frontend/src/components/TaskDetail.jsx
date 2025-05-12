import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Divider, Chip, Button, Grid, 
  Avatar, TextField, CircularProgress, IconButton, Tooltip,
  Card, CardContent, List, ListItem, ListItemText
} from '@mui/material';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

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
    }
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
      'approval': 'Согласование',
      'payment': 'Оплата',
      'delivery': 'Доставка',
      'universal': 'Универсальная'
    };
    return labels[type] || 'Универсальная';
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
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1, borderBottom: '1px solid #ccc' }}>
          {/* Приоритет */}
          <Button 
            variant="outlined" 
            sx={{ minWidth: '140px', borderRadius: 1 }}
            color={getPriorityColor(task?.priority)}
          >
            ПРИОРИТЕТ
          </Button>
          
          {/* Статус */}
          <Button 
            variant="outlined" 
            sx={{ minWidth: '140px', borderRadius: 1 }}
            color={getStatusColor(task?.status)}
          >
            СТАТУС
          </Button>
          
          {/* Название и идентификатор */}
          <Button 
            variant="outlined" 
            sx={{ flex: 1, justifyContent: 'flex-start', borderRadius: 1, minHeight: '40px' }}
          >
            <Typography sx={{ fontWeight: 'bold' }}>
              [{task?.id}] {task?.title} ({task?.author_details?.department})
              <br />
              {task?.author_details?.full_name} -&gt; {task?.executor_details?.full_name}
            </Typography>
          </Button>
          
          {/* Даты */}
          <Button variant="outlined" sx={{ borderRadius: 1, whiteSpace: 'nowrap' }}>
            дата создания
          </Button>
          
          <Button variant="outlined" sx={{ borderRadius: 1, whiteSpace: 'nowrap' }}>
            дедлайн
          </Button>
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
