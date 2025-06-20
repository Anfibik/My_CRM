import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Divider, Chip, Button, Grid,
  Avatar, TextField, CircularProgress, IconButton, Tooltip,
  Card, CardContent, List, ListItem, ListItemText, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  Checkbox, useTheme // Добавляем useTheme
} from '@mui/material';
import api from '../../api/config.js'; // Импортируем наш экземпляр api
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import { getDeadlineInfo } from '../../utils/deadlineUtils.js'; // Исправленный путь
import { TASK_TYPE_LABELS } from '../../constants.js';
import { useAuth } from '../../context/AuthContext.js';

const TaskDetail = () => {
  const theme = useTheme(); // Вызываем хук useTheme в начале компонента
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // Состояния для диалоговых окон редактирования участников и наблюдателей
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [observersDialogOpen, setObserversDialogOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [selectedObservers, setSelectedObservers] = useState([]);
  const [isUpdatingParticipants, setIsUpdatingParticipants] = useState(false);
  const [isUpdatingObservers, setIsUpdatingObservers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Состояние для управления выпадающим меню статусов
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const statusMenuOpen = Boolean(statusAnchorEl);
  const { user: currentUser } = useAuth();
  const [availableStatuses, setAvailableStatuses] = useState([]);

  // Загрузка данных задачи
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/tasks/${id}/`);
        let taskData = response.data;

        // Автоматическое обновление статуса с 'not_accepted' на 'pending'
        if (taskData.status === 'not_accepted') {
          try {
            console.log(`Task ${id} has status 'not_accepted', attempting to update to 'pending'.`);
            const statusUpdateResponse = await api.patch(`/api/tasks/${id}/`, { status: 'pending' });
            taskData = statusUpdateResponse.data; // Используем обновленные данные с сервера
            console.log(`Task ${id} status automatically updated to 'pending'.`, taskData);
          } catch (statusUpdateError) {
            console.error(`Error automatically updating status for task ${id} from 'not_accepted' to 'pending':`, statusUpdateError.response?.data || statusUpdateError.message);
            // Если не удалось обновить статус, задача останется 'not_accepted' до следующей попытки или ручного вмешательства (если оно возможно)
            // Можно добавить уведомление для пользователя здесь, если это критично.
          }
        }

        setTask(taskData);
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

  // Загрузка списка доступных пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users/');
        setAvailableUsers(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке пользователей:', err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (task && currentUser && currentUser.id) {
      const currentUserId = currentUser.id;
      const isAuthor = task.author_details?.id === currentUserId;
      const isExecutor = task.executor_details?.id === currentUserId;
      const isParticipant = task.participants_details?.some(p => p.id === currentUserId);

      let statusesToShow = [];
      const allNonClosedStatuses = ['not_accepted', 'pending', 'accepted', 'in_progress', 'completed'];

      if (isAuthor) {
        statusesToShow.push('closed');
        if (isExecutor || isParticipant) {
          statusesToShow.push(...allNonClosedStatuses);
        }
      } else {
        if (isExecutor || isParticipant) {
          statusesToShow.push(...allNonClosedStatuses);
        }
      }
      setAvailableStatuses([...new Set(statusesToShow)]);
    } else {
      setAvailableStatuses([]);
    }
  }, [task, currentUser]);

  // Обработчики действий
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await api.post('/api/task-discussions/', {
        task: id,
        content: newComment,
      });

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

  const handleCommentKeyDown = (event) => {
    // Отправляем комментарий по Enter, если не нажат Shift
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Предотвращаем перенос строки
      if (newComment.trim()) { // Проверяем, что комментарий не пустой
        handleSubmitComment();
      }
    }
  };

  const handleChangeStatus = async (newStatus) => {
    try {
      setChangingStatus(true);
      const response = await api.patch(`/api/tasks/${id}/`, { // Исправлен URL
        status: newStatus
      });
      setTask(prevTask => ({ ...prevTask, status: response.data.status, status_changed_at: response.data.status_changed_at }));
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

  // Обработчики для диалоговых окон редактирования участников и наблюдателей
  const handleOpenParticipantsDialog = () => {
    // Устанавливаем текущих участников из задачи
    setSelectedParticipants(task.participants || []);
    setParticipantsDialogOpen(true);

    // Если список пользователей пуст, попробуем загрузить его еще раз
    if (availableUsers.length === 0) {
      const fetchUsers = async () => {
        try {
          const response = await api.get('/api/users/');
          setAvailableUsers(response.data);
        } catch (err) {
          console.error('Ошибка при загрузке пользователей:', err);
        }
      };
      fetchUsers();
    }
  };

  const handleCloseParticipantsDialog = () => {
    setParticipantsDialogOpen(false);
  };

  const handleOpenObserversDialog = () => {
    // Устанавливаем текущих наблюдателей из задачи
    setSelectedObservers(task.observers || []);
    setObserversDialogOpen(true);

    // Если список пользователей пуст, попробуем загрузить его еще раз
    if (availableUsers.length === 0) {
      const fetchUsers = async () => {
        try {
          const response = await api.get('/api/users/');
          setAvailableUsers(response.data);
        } catch (err) {
          console.error('Ошибка при загрузке пользователей:', err);
        }
      };
      fetchUsers();
    }
  };

  const handleCloseObserversDialog = () => {
    setObserversDialogOpen(false);
  };

  // Функции для сохранения изменений в участниках и наблюдателях
  const handleSaveParticipants = async () => {
    setIsUpdatingParticipants(true);
    try {
      const response = await api.patch(`/api/tasks/${id}/`, { // Исправлен URL
        participants: selectedParticipants
      });
      setTask(prevTask => ({
        ...prevTask,
        participants: response.data.participants,
        participants_details: response.data.participants_details || []
      }));

      setParticipantsDialogOpen(false);
    } catch (err) {
      console.error('Ошибка при обновлении списка участников:', err);
    } finally {
      setIsUpdatingParticipants(false);
    }
  };

  const handleSaveObservers = async () => {
    setIsUpdatingObservers(true);
    try {
      const response = await api.patch(`/api/tasks/${id}/`, { // Исправлен URL
        observers: selectedObservers
      });
      setTask(prevTask => ({
        ...prevTask,
        observers: response.data.observers,
        observers_details: response.data.observers_details || []
      }));

      setObserversDialogOpen(false);
    } catch (err) {
      console.error('Ошибка при обновлении списка наблюдателей:', err);
    } finally {
      setIsUpdatingObservers(false);
    }
  };

  // Функция для удаления участника напрямую из детали задачи
  const removeParticipant = async (userIdToRemove) => {
    setIsUpdatingParticipants(true);
    try {
      // Формируем новый список ID участников без удаляемого
      const newParticipantIds = (task.participants || []).filter(id => id !== userIdToRemove);
      const response = await api.patch(`/api/tasks/${id}/`, { // Исправлен URL
        participants: newParticipantIds, // Отправляем обновленный список ID
      });
      setTask(response.data); // Обновляем задачу данными с сервера
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
    } finally {
      setIsUpdatingParticipants(false);
    }
  };

  // Функция для удаления наблюдателя напрямую
  const removeObserver = async (userIdToRemove) => {
    setIsUpdatingObservers(true);
    try {
      // Формируем новый список ID наблюдателей без удаляемого
      const newObserverIds = (task.observers || []).filter(id => id !== userIdToRemove);
      const response = await api.patch(`/api/tasks/${id}/`, { // Исправлен URL
        observers: newObserverIds, // Отправляем обновленный список ID
      });
      setTask(response.data); // Обновляем задачу данными с сервера
    } catch (err) {
      console.error('Ошибка при удалении наблюдателя:', err);
    } finally {
      setIsUpdatingObservers(false);
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
      'not_accepted': 'error',     // красный
      'pending': 'warning',        // оранжевый
      'accepted': 'secondary',     // фиолетовый (Material UI secondary color)
      'in_progress': 'primary',    // синий
      'completed': 'success',      // зеленый
      'closed': 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'Планово',
      'high': 'Критично'
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

  const getDepartmentLabel = useCallback((departmentCode) => {
    if (!departmentCode) return '';
    const departments = {
      "warehouses": "ШМБ",
      "racks": "Стеллажные системы",
      "warehouses_machines": "Складская техника",
      "plastic_containers": "Пластиковая тара",
      "trash_bins": "Мусорные баки",
      "sorting_systems": "Системы сортировки",
      "automation": "Автоматизация",
      "services": "Сервисные услуги",
      "administrations": "Администрация",
      "logistics": "Логистика",
      "finance": "Финансы и бухгалтерия",
      "marketing": "Маркетинг",
    };
    return departments[departmentCode] || departmentCode;
  }, []);

  const getRoleLabel = useCallback((roleCode) => {
    if (!roleCode) return '';
    const roleMap = {
      'owner': 'Собственник',
      'sales_manager': 'Менеджер по продажам',
      'project_manager': 'Проектный менеджер',
      'account_manager': 'Аккаунт менеджер',
      'logistic': 'Логист',
      'engineer': 'Инженер',
      'warehouse_worker': 'Кладовщик',
      'accountant': 'Бухгалтер',
      'lawyer': 'Юрист',
      'top_manager': 'ТОП Менеджер',
      'call_operator': 'Оператор кол-центра',
      'admin': 'Администратор',
      'manager': 'Менеджер',
      'sales': 'Продажи'
    };
    return roleMap[roleCode] || roleCode;
  }, []);

  // Группировка и сортировка участников по ДЕПАРТАМЕНТАМ
  const groupedAndSortedParticipants = useMemo(() => {
    if (!task || !task.participants_details || task.participants_details.length === 0) {
      return [];
    }

    const groups = task.participants_details.reduce((acc, participant) => {
      const departmentLabel = getDepartmentLabel(participant.department) || 'Без отдела'; // Группируем по департаменту
      if (!acc[departmentLabel]) {
        acc[departmentLabel] = [];
      }
      acc[departmentLabel].push(participant);
      return acc;
    }, {});

    const sortedDepartmentLabels = Object.keys(groups).sort((a, b) => a.localeCompare(b)); // Сортируем названия департаментов

    return sortedDepartmentLabels.map(departmentLabel => ({
      departmentLabel, // Используем departmentLabel
      participants: groups[departmentLabel]
    }));
  }, [task, getDepartmentLabel]); // Зависимость от getDepartmentLabel

  // Функция для фильтрации доступных пользователей
  const filterAvailableUsers = (users) => {
    return users.filter(user => {
      const isAuthor = task.author_details && user.id === task.author_details.id;
      const isExecutor = task.executor_details && user.id === task.executor_details.id;
      const isAdmin = user.is_admin; // Исключаем администратора Django
      return !isAuthor && !isExecutor && !isAdmin;
    });
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
                  {(() => {
                    const deadlineInfo = getDeadlineInfo(task?.deadline);

                    if (!task?.deadline) {
                      return <Typography variant="body2" color={deadlineInfo.color}>—</Typography>;
                    }

                    let fontWeight;
                    // Сравниваем со значениями из theme, если они доступны, иначе с текстовыми строками
                    if (deadlineInfo.color === (theme?.palette?.error?.main || 'error.main')) {
                      fontWeight = 'bold';
                    } else if (deadlineInfo.color === (theme?.palette?.warning?.main || 'warning.main')) {
                      fontWeight = 'medium';
                    } else {
                      fontWeight = 'regular';
                    }

                    return (
                      <Typography
                        variant="body2"
                        fontWeight={fontWeight}
                        color={deadlineInfo.color}
                      >
                        {deadlineInfo.text}
                      </Typography>
                    );
                  })()}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Блок для иконки дедлайна */}
          <Box sx={{
            width: '7%',
            px: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {(() => {
              const deadlineInfo = getDeadlineInfo(task?.deadline);
              let iconElement;

              switch (deadlineInfo.iconName) {
                case 'Warning':
                  iconElement = <WarningIcon sx={{ fontSize: '2rem' }} />;
                  break;
                case 'AccessTime':
                  iconElement = <AccessTimeIcon sx={{ fontSize: '2rem' }} />;
                  break;
                case 'CalendarToday':
                default:
                  iconElement = <CalendarTodayIcon sx={{ fontSize: '2rem' }} />;
                  break;
              }
              return React.cloneElement(iconElement, { sx: { ...iconElement.props.sx, color: deadlineInfo.color } });
            })()}
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
                cursor: (changingStatus || availableStatuses.length === 0) ? 'default' : 'pointer',
                opacity: (changingStatus || availableStatuses.length === 0) ? 0.5 : 1,
                transition: 'background-color 0.3s'
              }}
              onClick={(changingStatus || availableStatuses.length === 0) ? undefined : handleStatusClick}
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
              PaperProps={{ sx: { maxHeight: 300, overflow: 'auto', width: '200px' } }}
            >
              {(() => {
                const orderedStatusesForMenu = [
                  { value: 'not_accepted', label: getStatusLabel('not_accepted') },
                  { value: 'pending', label: getStatusLabel('pending') },
                  { value: 'accepted', label: getStatusLabel('accepted') },
                  { value: 'in_progress', label: getStatusLabel('in_progress') },
                  { value: 'completed', label: getStatusLabel('completed') },
                  { value: 'closed', label: getStatusLabel('closed') }
                ];
                return orderedStatusesForMenu.map((statusOption) => {
                  if (availableStatuses.includes(statusOption.value)) {
                    return (
                      <MenuItem
                        key={statusOption.value}
                        onClick={() => {
                          handleChangeStatus(statusOption.value);
                          // handleStatusClose(); // Закрытие меню теперь в handleChangeStatus
                        }}
                        selected={task?.status === statusOption.value}
                        disabled={task?.status === statusOption.value || changingStatus}
                      >
                        <Box sx={{
                          width: '100%',
                          height: '28px',
                          borderRadius: '14px',
                          bgcolor: statusOption.value === 'closed' ? 'grey.700' : `${getStatusColor(statusOption.value)}.light`,
                          color: statusOption.value === 'closed' ? '#fff' : `${getStatusColor(statusOption.value)}.contrastText`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          px: 1,
                        }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {statusOption.label}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  }
                  return null;
                });
              })()}
            </Menu>
          </Box>
        </Box>

        {/* Основное содержимое */}
        <Box sx={{ display: 'flex', height: 'calc(100vh - 150px)' }}>
          {/* Левая колонка с информацией */}
          <Box sx={{ width: '320px', p: 2, borderRight: '1px solid #ccc', height: '100%', overflow: 'auto' }}>
            {/* Название сделки как ссылка */}
            <Box sx={{ mb: 1 }}> {/* Outer Box for Сделка */}
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}> {/* Label color changed to secondary */}
                Сделка:
              </Typography>
              {task.deal ? (
                <Box
                  component="a"
                  href={`/deals/${task.deal}`}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                    display: 'block',
                    fontSize: '0.85rem',
                    pl: theme.spacing(1) // Indent value
                  }}
                >
                  {task.deal_details?.name}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', pl: theme.spacing(1) }}> {/* Value color changed to primary */}
                  Не указана
                </Typography>
              )}
            </Box>

            {/* Блок с информацией о компании и контакте сделки */}
            {task?.deal_details?.lead && (
              <Box sx={{ mt: 1, mb: 1.5 }}>
                {task.deal_details.lead.company?.name && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}> {/* Label color changed */}
                      Компания:
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', pl: theme.spacing(1) }}> {/* Value color changed */}
                      {task.deal_details.lead.company.name}
                    </Typography>
                  </Box>
                )}
                {task.deal_details.lead.contact?.name && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}> {/* Label color changed */}
                      Контакт:
                    </Typography>
                    {task.deal_details.lead.contact.id ? (
                      <Box
                        component="a"
                        href={`/contacts/${task.deal_details.lead.contact.id}`}
                        sx={{
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' },
                          display: 'block',
                          fontSize: '0.85rem',
                          pl: theme.spacing(1)
                        }}
                      >
                        {task.deal_details.lead.contact.name}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', pl: theme.spacing(1) }}>
                        {task.deal_details.lead.contact.name}
                      </Typography>
                    )}
                  </Box>
                )}
                {task.deal_details.lead.contact?.phone_numbers?.[0]?.phone_number && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}> {/* Label color changed */}
                      Телефон:
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', pl: theme.spacing(1) }}> {/* Value color changed */}
                      {task.deal_details.lead.contact.phone_numbers[0].phone_number}
                      {task.deal_details.lead.contact.messenger && ` (${task.deal_details.lead.contact.messenger})`}
                    </Typography>
                  </Box>
                )}
                {task.deal_details.lead.contact?.email && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}> {/* Label color changed */}
                      Email:
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontSize: '0.85rem', pl: theme.spacing(1) }}> {/* Value color changed */}
                      {task.deal_details.lead.contact.email}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            {/* Горизонтальная черта */}
            <Box sx={{ my: 1.5 }}>
              <Divider />
            </Box>
            {/* Тип задачи */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ color: 'text.secondary', width: '92px', flexShrink: 0, minWidth: '92px', fontSize: '0.85rem' }}>
                Тип задачи:
              </Box>
              <Box component="span" sx={{ color: 'text.primary', fontSize: '0.85rem' }}>
                {TASK_TYPE_LABELS[task.task_type] || task.task_type || 'Не указан'}
              </Box>
            </Box>
            
            {/* Горизонтальная черта перед исполнителем */}
            <Box sx={{ my: 1.5 }}>
              <Divider />
            </Box>

            {/* Информация об авторе */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ color: 'text.secondary', width: '92px', flexShrink: 0, minWidth: '92px', fontSize: '0.85rem' }}>
                  Автор:
                </Box>
                {task.author_details ? (
                  <Box component="span" sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
                    {task.author_details.full_name}
                  </Box>
                ) : (
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Информация недоступна</Box>
                )}
              </Box>
              {task.author_details && (
                <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
                  {(() => {
                    // Преобразование роли в человекочитаемый вид
                    const roleMap = {
                      'owner': 'Собственник',
                      'sales_manager': 'Менеджер по продажам',
                      'project_manager': 'Проектный менеджер',
                      'account_manager': 'Аккаунт менеджер',
                      'logistic': 'Логист',
                      'engineer': 'Инженер',
                      'warehouse_worker': 'Кладовщик',
                      'accountant': 'Бухгалтер',
                      'lawyer': 'Юрист',
                      'top_manager': 'ТОП Менеджер',
                      'call_operator': 'Оператор кол-центра',
                      'admin': 'Администратор',
                      'manager': 'Менеджер',
                      'sales': 'Продажи'
                    };
                    const role = roleMap[task.author_details.role] || task.author_details.role || 'Не указана';
                    return `${role} / ${getDepartmentLabel(task.author_details.department)}`;
                  })()}
                </Box>
              )}
            </Box>

            {/* Горизонтальная черта перед исполнителем */}
            <Box sx={{ my: 1.5 }}>
              <Divider />
            </Box>

            {/* Информация об исполнителе */}
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box component="span" sx={{ color: 'text.secondary', width: '92px', flexShrink: 0, minWidth: '92px', fontSize: '0.85rem' }}>
                  Исполнитель:
                </Box>
                {task.executor_details ? (
                  <Box component="span" sx={{ color: 'text.primary', fontSize: '0.9rem' }}>
                    {task.executor_details.full_name}
                  </Box>
                ) : (
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>Информация недоступна</Box>
                )}
              </Box>
              {task.executor_details && (
                <Box sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
                  {(() => {
                    // Преобразование роли в человекочитаемый вид
                    const roleMap = {
                      'owner': 'Собственник',
                      'sales_manager': 'Менеджер по продажам',
                      'project_manager': 'Проектный менеджер',
                      'account_manager': 'Аккаунт менеджер',
                      'logistic': 'Логист',
                      'engineer': 'Инженер',
                      'warehouse_worker': 'Кладовщик',
                      'accountant': 'Бухгалтер',
                      'lawyer': 'Юрист',
                      'top_manager': 'ТОП Менеджер',
                      'call_operator': 'Оператор кол-центра',
                      'admin': 'Администратор',
                      'manager': 'Менеджер',
                      'sales': 'Продажи'
                    };
                    const role = roleMap[task.executor_details.role] || task.executor_details.role || 'Не указана';
                    return `${role} / ${getDepartmentLabel(task.executor_details.department)}`;
                  })()}
                </Box>
              )}
            </Box>

            {/* Горизонтальная черта после исполнителя */}
            <Box sx={{ my: 1.5 }}>
              <Divider />
            </Box>

            {/* Участники с возможностью редактирования */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              {task.participants_details && task.participants_details.length > 0 ? (
                // Если участники добавлены
                <>
                  <Box
                    component="span"
                    onClick={handleOpenParticipantsDialog}
                    sx={{
                      color: 'text.secondary',
                      width: '92px',
                      flexShrink: 0,
                      minWidth: '92px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{
                      fontWeight: 'bold', // Жирный шрифт для 'Участники'
                      color: 'grey.800', // Темно-серый цвет для 'Участники'
                      fontSize: '1rem', // Немного больший шрифт для 'Участники'
                      mr: 1
                    }}>
                      Участники:
                    </Typography>
                  </Box>
                </>
              ) : (
                // Если участники не добавлены
                <>
                  <Box
                    component="button"
                    onClick={handleOpenParticipantsDialog}
                    sx={{
                      color: 'text.secondary',
                      backgroundColor: 'grey.100',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      padding: '2px 6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.200'
                      },
                      transition: 'background-color 0.3s',
                      width: '92px'
                    }}
                  >
                    Участники
                  </Box>
                </>
              )}
            </Box>

            {/* Список участников */}
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              p: '1px',
              mb: 1,
              ml: 2
            }}>
              {groupedAndSortedParticipants.length > 0 ? (
                groupedAndSortedParticipants.map((group, groupIndex) => (
                  <Box
                    key={group.departmentLabel}
                    sx={{
                      width: '100%',
                      mb: 0.75,
                      // Применяем borderBottom ко всем, кроме последнего элемента
                      borderBottom: groupIndex < groupedAndSortedParticipants.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                      pb: groupIndex < groupedAndSortedParticipants.length - 1 ? 0.75 : 0 // Убираем padding-bottom у последнего элемента тоже
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      component="div"
                      sx={{
                        fontWeight: 'normal',
                        color: 'grey.600',
                        fontSize: '0.875rem',
                        mb: 0.25,
                        width: '100%'
                      }}
                    >
                      {group.departmentLabel}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', width: '100%', pt: 0.25 }}>
                      {group.participants.map((participant, index) => (
                        <Chip
                          key={participant.id}
                          label={participant.full_name}
                          size="small"
                          deleteIcon={<CancelIcon sx={{ fontSize: 16, color: 'grey.800' }} />}
                          onDelete={(e) => { e.stopPropagation(); removeParticipant(participant.id); }}
                          sx={{
                            width: 'calc(50% - 2px)',
                            margin: '1px',
                            boxSizing: 'border-box',
                            // Важно: index теперь относится к списку участников *внутри группы*
                            paddingRight: index % 2 === 0 ? theme.spacing(0.5) : 0,
                            paddingLeft: index % 2 !== 0 ? theme.spacing(0.5) : 0,
                            bgcolor: 'grey.300',
                            color: 'grey.800',
                            fontSize: '0.65rem',
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            '& .MuiChip-label': {
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                              flexGrow: 1,
                            },
                            '& .MuiChip-deleteIcon': {
                              flexShrink: 0,
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              ) : null}
            </Box>

            {/* Наблюдатели с возможностью редактирования */}
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
              {task.observers_details && task.observers_details.length > 0 ? (
                // Если наблюдатели добавлены
                <>
                  <Box
                    component="span"
                    onClick={handleOpenObserversDialog}
                    sx={{
                      // width: '92px', // Убрано для гибкости Typography
                      // flexShrink: 0, 
                      // minWidth: '92px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{
                      fontWeight: 'bold',
                      color: 'grey.800',
                      fontSize: '1rem',
                      mr: 1
                    }}>
                      Наблюдатели:
                    </Typography>
                  </Box>
                </>
              ) : (
                // Если наблюдатели не добавлены
                <>
                  <Box
                    component="button"
                    onClick={handleOpenObserversDialog}
                    sx={{
                      color: 'text.secondary',
                      backgroundColor: 'grey.100',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      padding: '2px 6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.200'
                      },
                      transition: 'background-color 0.3s',
                      width: '92px'
                    }}
                  >
                    Наблюдатели
                  </Box>
                </>
              )}
            </Box>

            {/* Список наблюдателей */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: '1px', mb: 2, ml: 2 }}>
              {task.observers_details && task.observers_details.length > 0 ? (
                task.observers_details.map(observer => (
                  <Tooltip
                    key={observer.id}
                    title={`${getRoleLabel(observer.role) || ''}${observer.role && observer.department ? ' / ' : ''}${getDepartmentLabel(observer.department) || ''}`}
                    arrow
                    enterDelay={300}
                  >
                    <Chip
                      label={observer.full_name}
                      size="small"
                      deleteIcon={<CancelIcon sx={{ fontSize: 16, color: 'grey.800' }} />}
                      onDelete={(e) => { e.stopPropagation(); removeObserver(observer.id); }}
                      sx={{
                        width: 'calc(50% - 2px)',
                        margin: '1px',
                        boxSizing: 'border-box',
                        bgcolor: 'grey.300',
                        color: 'grey.800',
                        fontSize: '0.65rem',
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        '& .MuiChip-label': {
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          minWidth: 0,
                          flexGrow: 1,
                        },
                        '& .MuiChip-deleteIcon': {
                          flexShrink: 0,
                        }
                      }}
                    />
                  </Tooltip>
                ))
              ) : null}
            </Box>
          </Box>

          {/* Основная область контента */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Описание задачи */}
            <Box sx={{ height: '60%', p: 2, overflowY: 'auto', mr: '30px' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Форма заполнения, детализация, описание
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {task?.description || 'Описание отсутствует'}
              </Typography>
            </Box>

            {/* Обсуждение */}
            <Box sx={{ height: '40%', display: 'flex', flexDirection: 'column', borderTop: '1px solid #ccc', p: 2, mr: '30px' }}>
              <Typography variant="h6" gutterBottom>
                Обсуждение
              </Typography>

              {task?.discussions?.length > 0 ? (
                <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 1 }}>
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
                  onKeyDown={handleCommentKeyDown}
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

      {/* Диалоговое окно для редактирования участников */}
      <Dialog open={participantsDialogOpen} onClose={handleCloseParticipantsDialog} fullWidth maxWidth="sm">
        <DialogTitle>Управление участниками задачи</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Добавьте участников, которые будут работать над задачей совместно с исполнителем.
            </Typography>

            {/* Список доступных пользователей */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Доступные пользователи:
              </Typography>
              <Box sx={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 1 }}>
                {availableUsers.
                  // Исключаем автора и исполнителя из списка
                  filter(user => {
                    const isAuthor = task.author_details && user.id === task.author_details.id;
                    const isExecutor = task.executor_details && user.id === task.executor_details.id;
                    const isAdmin = user.is_admin; // администратор Django
                    return !isAuthor && !isExecutor && !isAdmin;
                  }).
                  map(user => (
                    <Box
                      key={user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        mb: 0.5,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Если пользователь уже выбран, удаляем его из списка, иначе добавляем
                        if (selectedParticipants.includes(user.id)) {
                          setSelectedParticipants(prev => prev.filter(id => String(id) !== String(user.id)));
                        } else {
                          setSelectedParticipants(prev => [...prev, user.id]);
                        }
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(() => {
                            // Преобразование роли в человекочитаемый вид
                            const roleMap = {
                              'owner': 'Собственник',
                              'sales_manager': 'Менеджер по продажам',
                              'project_manager': 'Проектный менеджер',
                              'account_manager': 'Аккаунт менеджер',
                              'logistic': 'Логист',
                              'engineer': 'Инженер',
                              'warehouse_worker': 'Кладовщик',
                              'accountant': 'Бухгалтер',
                              'lawyer': 'Юрист',
                              'top_manager': 'ТОП Менеджер',
                              'call_operator': 'Оператор кол-центра',
                              'admin': 'Администратор',
                              'manager': 'Менеджер',
                              'sales': 'Продажи'
                            };
                            const role = roleMap[user.role] || user.role || 'Не указана';
                            return `${role} / ${getDepartmentLabel(user.department)}`;
                          })()}
                        </Typography>
                      </Box>
                      <Checkbox
                        checked={selectedParticipants.includes(user.id)}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  ))
                }
                {availableUsers.filter(user => {
                  const isAuthor = task.author_details && user.id === task.author_details.id;
                  const isExecutor = task.executor_details && user.id === task.executor_details.id;
                  const isAdmin = user.is_admin; // администратор Django
                  return !isAuthor && !isExecutor && !isAdmin;
                }).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1, fontStyle: 'italic' }}>
                      Нет доступных пользователей
                    </Typography>
                  )
                }
              </Box>
            </Box>

            {/* Выбранные участники */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Выбранные участники: {selectedParticipants.length > 0 ? selectedParticipants.length : 'нет'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {availableUsers.
                  filter(user => selectedParticipants.includes(user.id)).
                  map(user => (
                    <Chip
                      key={user.id}
                      label={user.full_name}
                      deleteIcon={<CancelIcon sx={{ fontSize: 16, color: 'grey.800' }} />}
                      onDelete={(e) => { e.stopPropagation(); setSelectedParticipants(prev => prev.filter(id => String(id) !== String(user.id))); }}
                      sx={{ bgcolor: 'grey.300', color: 'grey.800', fontSize: '0.65rem', height: 24 }}
                    />
                  ))
                }
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseParticipantsDialog}
            disabled={isUpdatingParticipants}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSaveParticipants}
            variant="contained"
            disabled={isUpdatingParticipants}
            startIcon={isUpdatingParticipants ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалоговое окно для редактирования наблюдателей */}
      <Dialog open={observersDialogOpen} onClose={handleCloseObserversDialog} fullWidth maxWidth="sm">
        <DialogTitle>Управление наблюдателями задачи</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Добавьте наблюдателей, которые будут получать уведомления о ходе выполнения задачи.
            </Typography>

            {/* Список доступных пользователей */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Доступные пользователи:
              </Typography>
              <Box sx={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 1 }}>
                {availableUsers.
                  // Исключаем автора и исполнителя из списка
                  filter(user => {
                    const isAuthor = task.author_details && user.id === task.author_details.id;
                    const isExecutor = task.executor_details && user.id === task.executor_details.id;
                    const isAdmin = user.is_admin; // администратор Django
                    return !isAuthor && !isExecutor && !isAdmin;
                  }).
                  map(user => (
                    <Box
                      key={user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        mb: 0.5,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' },
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // Если пользователь уже выбран, удаляем его из списка, иначе добавляем
                        if (selectedObservers.includes(user.id)) {
                          setSelectedObservers(prev => prev.filter(id => String(id) !== String(user.id)));
                        } else {
                          setSelectedObservers(prev => [...prev, user.id]);
                        }
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {user.full_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(() => {
                            // Преобразование роли в человекочитаемый вид
                            const roleMap = {
                              'owner': 'Собственник',
                              'sales_manager': 'Менеджер по продажам',
                              'project_manager': 'Проектный менеджер',
                              'account_manager': 'Аккаунт менеджер',
                              'logistic': 'Логист',
                              'engineer': 'Инженер',
                              'warehouse_worker': 'Кладовщик',
                              'accountant': 'Бухгалтер',
                              'lawyer': 'Юрист',
                              'top_manager': 'ТОП Менеджер',
                              'call_operator': 'Оператор кол-центра',
                              'admin': 'Администратор',
                              'manager': 'Менеджер',
                              'sales': 'Продажи'
                            };
                            const role = roleMap[user.role] || user.role || 'Не указана';
                            return `${role} / ${getDepartmentLabel(user.department)}`;
                          })()}
                        </Typography>
                      </Box>
                      <Checkbox
                        checked={selectedObservers.includes(user.id)}
                        color="info"
                        size="small"
                      />
                    </Box>
                  ))
                }
                {availableUsers.filter(user => {
                  const isAuthor = task.author_details && user.id === task.author_details.id;
                  const isExecutor = task.executor_details && user.id === task.executor_details.id;
                  const isAdmin = user.is_admin; // администратор Django
                  return !isAuthor && !isExecutor && !isAdmin;
                }).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1, fontStyle: 'italic' }}>
                      Нет доступных пользователей
                    </Typography>
                  )
                }
              </Box>
            </Box>

            {/* Выбранные наблюдатели */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Выбранные наблюдатели: {selectedObservers.length > 0 ? selectedObservers.length : 'нет'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {availableUsers.
                  filter(user => selectedObservers.includes(user.id)).
                  map(user => (
                    <Chip
                      key={user.id}
                      label={user.full_name}
                      onDelete={(e) => { e.stopPropagation(); setSelectedObservers(prev => prev.filter(id => String(id) !== String(user.id))); }}
                      sx={{ bgcolor: 'grey.300', color: 'grey.800' }}
                    />
                  ))
                }
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseObserversDialog}
            disabled={isUpdatingObservers}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSaveObservers}
            variant="contained"
            disabled={isUpdatingObservers}
            startIcon={isUpdatingObservers ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskDetail;
