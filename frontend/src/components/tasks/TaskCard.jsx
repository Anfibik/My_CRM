// --- ИМПОРТЫ ---
import React, { useState } from 'react';
// Импорты компонентов Material UI для построения интерфейса карточки
import { Card, CardContent, Typography, Box, Tooltip, Divider, Button, CircularProgress, Link as MuiLink } from '@mui/material';
// Импорт Link из react-router-dom для навигации
import { Link as RouterLink } from 'react-router-dom';
// Импорт сконфигурированного экземпляра axios для API-запросов
import api from '../../api/config';
// Утилита для форматирования информации о дедлайне
import { getDeadlineInfo } from '../../utils/deadlineUtils.js';
// Хук для навигации
import { useNavigate } from 'react-router-dom';
// Иконки Material UI
import WarningIcon from '@mui/icons-material/Warning';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
// Константы с метками для отделов
import { DEPARTMENT_LABELS } from '../../constants';
// Утилиты для работы со статусами и типами задач (метки, цвета, иконки)
import {
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  getTaskTypeLabel
} from '../../utils/taskUtils.js';

// --- КОМПОНЕНТ TaskCard ---
// task: объект задачи
// provided: объект от react-beautiful-dnd для drag-and-drop (если карточка перетаскиваемая)
// isDragging: флаг, указывающий, перетаскивается ли карточка в данный момент
// showInteractionButtons: флаг, показывать ли кнопки взаимодействия (Принять/Завершить) при наведении
// onTaskUpdate: функция обратного вызова для обновления задачи в родительском компоненте
const TaskCard = ({ task, provided, isDragging = false, showInteractionButtons = true, onTaskUpdate }) => {
  // --- ХУКИ И СОСТОЯНИЕ ---
  const navigate = useNavigate(); // Хук для программной навигации
  // Состояния для отслеживания наведения мыши на элементы (для показа кнопок)
  const [isCreateDateHovered, setIsCreateDateHovered] = useState(false);
  const [isDeadlineHovered, setIsDeadlineHovered] = useState(false);
  // Состояния для отслеживания процесса выполнения API-запросов (принятие/завершение задачи)
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // --- ВСПОМОГАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ---
  // Определяет, является ли карточка перетаскиваемой (если передан 'provided')
  const isDraggable = !!provided;

  // Стили для карточки в состоянии перетаскивания
  const draggingStyle = isDraggable && isDragging ? {
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)', // Тень при перетаскивании
    backgroundColor: 'rgba(245, 245, 245, 0.9)', // Полупрозрачный фон
  } : {};

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
  // Флаг, указывающий, закрыта ли задача
  const isTaskClosed = task.status === 'closed';

  // Функция для форматирования даты и времени
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'; // Если дата не указана
    const date = new Date(dateString);
    const options = { // Параметры форматирования
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
    };
    return date.toLocaleDateString('ru-RU', options); // Форматирование для русской локали
  };

  // Обработчик для принятия задачи
  const handleAcceptTask = async (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    if (isAccepting || !task?.id) return; // Защита от повторного вызова или отсутствия ID

    setIsAccepting(true); // Устанавливаем флаг загрузки
    try {
      // API-запрос на изменение статуса задачи на 'accepted'
      await api.patch(`/api/tasks/${task.id}/`, { status: 'accepted' });
      console.log(`Task ${task.id} status changed to accepted.`);
      // Если есть функция обратного вызова, вызываем ее для обновления UI
      if (onTaskUpdate) onTaskUpdate(task.id, { ...task, status: 'accepted' });
    } catch (err) {
      console.error(`Error updating task ${task.id} to accepted:`, err);
    } finally {
      setIsAccepting(false); // Сбрасываем флаг загрузки
      setIsCreateDateHovered(false); // Сбрасываем состояние наведения (чтобы кнопка скрылась)
    }
  };

  // Обработчик для завершения задачи
  const handleCompleteTask = async (e) => {
    e.stopPropagation();
    if (isCompleting || !task?.id) return;

    setIsCompleting(true);
    try {
      // API-запрос на изменение статуса задачи на 'completed'
      await api.patch(`/api/tasks/${task.id}/`, { status: 'completed' });
      console.log(`Task ${task.id} status changed to completed.`);
      if (onTaskUpdate) onTaskUpdate(task.id, { ...task, status: 'completed' });
    } catch (err) {
      console.error(`Error updating task ${task.id} to completed:`, err);
    } finally {
      setIsCompleting(false);
      setIsDeadlineHovered(false);
    }
  };

  // --- JSX РАЗМЕТКА КАРТОЧКИ ---
  return (
    <Card
      // Для DND: ref и props от react-beautiful-dnd
      ref={isDraggable ? provided.innerRef : null}
      {...(isDraggable ? provided.draggableProps : {})}
      {...(isDraggable ? provided.dragHandleProps : {})} // "Ручка" для перетаскивания (вся карточка)
      sx={{
        // --- ОСНОВНЫЕ СТИЛИ КАРТОЧКИ ---
        height: '150px', // Фиксированная высота
        width: '170px',  // Фиксированная ширина
        cursor: isDraggable ? 'grab' : 'pointer', // Курсор в зависимости от возможности перетаскивания
        // Граница для задач с высоким приоритетом
        border: task.priority === 'high' ? '3px solid' : 'none',
        borderColor: task.priority === 'high' ? 'error.main' : undefined,
        backgroundColor: 'white', // Основной фон карточки
        '&:hover': { // Стили при наведении (не для перетаскивания)
          boxShadow: 4
        },
        ...draggingStyle, // Применение стилей перетаскивания
        // Стили для закрытых задач (полупрозрачность, другой фон)
        ...(isTaskClosed && {
          opacity: 0.6,
          backgroundColor: 'rgba(162, 162, 162, 0.83)',
        }),
      }}
      // Клик по карточке ведет на страницу задачи
      onClick={() => {
        // Опционально: можно добавить условие, если закрытые задачи не должны быть кликабельны
        // if (task.status === 'closed') return; 
        navigate(`/tasks/${task.id}`);
      }}
    >
      <CardContent sx={{ padding: 0.5, '&:last-child': { pb: 0 } /* Убираем лишний padding снизу */ }}>
        {/* --- ВЕРХНИЙ РЯД: СТАТУС, ТИП ЗАДАЧИ, ИНФО О ДЕДЛАЙНЕ --- */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, width: '100%' }}>
          {/* Иконка статуса задачи с всплывающей подсказкой */}
          <Tooltip title={getStatusLabel(task.status)} placement="top">
            {getStatusIcon(task.status) ? React.cloneElement(getStatusIcon(task.status), {
              sx: {
                color: getStatusColor(task.status), // Цвет иконки статуса
                ...(isTaskClosed && { opacity: 0.7 }) // Доп. стиль для закрытых задач
              }
            }) : null}
          </Tooltip>

          {/* Тип задачи (некликабельный) */}
          <Typography
            variant="caption"
            sx={{
              flexGrow: 1, // Занимает доступное пространство
              textAlign: 'center',
              mx: 0, // Горизонтальные отступы
              overflow: 'hidden', // Скрытие переполнения
              textOverflow: 'ellipsis', // Многоточие при переполнении
              whiteSpace: 'nowrap', // Запрет переноса строки
              fontSize: '0.75rem',
              lineHeight: '1.2',
            }}
          >
            {getTaskTypeLabel(task.task_type)} {/* Отображение метки типа задачи */}
          </Typography>

          {/* Информация о дедлайне (иконка или текст) */}
          {(() => {
            const deadlineInfo = getDeadlineInfo(task.deadline); // Получение информации о дедлайне
            // Если дедлайн просрочен (0 часов осталось и дата в прошлом) - показываем иконку предупреждения
            if (deadlineInfo.iconName === 'Warning' && deadlineInfo.remainingHours === 0 && new Date(task.deadline) < new Date()) {
              return (
                <Tooltip title={deadlineInfo.text} placement="top">
                  <WarningIcon sx={{
                    color: deadlineInfo.color,
                    fontSize: '1rem',
                    ...(isTaskClosed && { opacity: 0.7 })
                  }} />
                </Tooltip>
              );
            } else { // Иначе показываем текст (например, "Осталось 2д" или "Сегодня")
              let displayText = deadlineInfo.text;
              // Убираем префикс "Осталось " для краткости
              if (typeof displayText === 'string' && displayText.startsWith("Осталось ")) {
                displayText = displayText.substring("Осталось ".length);
              }
              return (
                <Typography
                  variant="caption"
                  sx={{
                    color: deadlineInfo.color, // Цвет текста дедлайна (например, красный для просроченных)
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    minWidth: '45px', // Минимальная ширина для выравнивания
                    px: 0.5,
                  }}
                >
                  {displayText}
                </Typography>
              );
            }
          })()}
        </Box>

        {/* --- СРЕДНИЙ РЯД: АВТОР, ИСПОЛНИТЕЛЬ, ОТДЕЛ --- */}
        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column' }}>
          {/* Автор задачи */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Авт.:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.6rem', pl: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={task.author_details?.full_name || 'Не указан'} // Полное имя во всплывающей подсказке
            >
              {task.author_details?.full_name || 'Не указан'}
            </Typography>
          </Box>

          {/* Исполнитель задачи */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Исп.:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.6rem', pl: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={task.executor_details?.full_name || 'Не назначен'}
            >
              {task.executor_details?.full_name || 'Не назначен'}
            </Typography>
          </Box>

          {/* Отдел исполнителя */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold' }}>
              Деп.:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.6rem', pl: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={DEPARTMENT_LABELS[task.executor_details?.department] || 'Отдел не указан'}
            >
              {DEPARTMENT_LABELS[task.executor_details?.department] || '-'}
            </Typography>
          </Box>
        </Box>

        {/* --- НИЖНИЙ РЯД: ДАТА СОЗДАНИЯ (КНОПКА ПРИНЯТЬ), ИКОНКА ИНФО, ДАТА ДЕДЛАЙНА (КНОПКА ЗАВЕРШИТЬ) --- */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mt: 0.5, // Отступ сверху
          pt: 0.5, // Внутренний отступ сверху
          borderTop: '1px solid rgba(0,0,0,0.08)', // Верхняя граница-разделитель
          fontSize: '0.6rem',
          color: isTaskClosed ? 'text.disabled' : 'text.secondary', // Цвет текста в зависимости от статуса задачи
        }}
        >
          {/* Блок с датой создания / кнопкой "Принять" */}
          <Box
            sx={{
              flexBasis: '45%', // Ширина блока
              textAlign: 'left',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              minHeight: '24px', // Минимальная высота для выравнивания кнопки
            }}
            onMouseEnter={() => setIsCreateDateHovered(true)} // Показать кнопку при наведении
            onMouseLeave={() => setIsCreateDateHovered(false)} // Скрыть кнопку
          >
            {/* Условие для показа кнопки "Принять" */}
            {showInteractionButtons && isCreateDateHovered && !isTaskClosed && task.status !== 'accepted' && task.status !== 'in_progress'
              && task.status !== 'completed' && task.status !== 'closed' ? (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                onClick={handleAcceptTask}
                disabled={isAccepting} // Блокировка кнопки во время запроса
                sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative' }}
              >
                {/* Индикатор загрузки или текст кнопки */}
                {isAccepting ? <CircularProgress size={12} sx={{ color: 'secondary.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'Принять'}
              </Button>
            ) : ( // Иначе показываем дату создания
              <Tooltip title={`Создана: ${formatDateTime(task.created_at)}`} placement="bottom-start">
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatDateTime(task.created_at)}
                </Typography>
              </Tooltip>
            )}
          </Box>

          {/* Иконка информации с всплывающей подсказкой (название и описание задачи) */}
          <Box sx={{ flexBasis: '10%', textAlign: 'center' }}>
            <Tooltip
              title={ // Содержимое всплывающей подсказки
                <React.Fragment>
                  <Typography color="inherit" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}>
                    {task.title} {/* Название задачи */}
                  </Typography>
                  {task.description && <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />}
                  <Typography variant="body2" sx={{ textAlign: 'left', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                    {task.description || "Описание отсутствует."} {/* Описание задачи */}
                  </Typography>
                </React.Fragment>
              }
              placement="top" // Позиционирование подсказки
              arrow // Стрелка у подсказки
              componentsProps={{ // Стили для самой подсказки и стрелки
                tooltip: {
                  sx: {
                    maxWidth: 300,
                    bgcolor: 'background.paper', // Фон подсказки
                    color: 'text.primary',    // Цвет текста
                    boxShadow: 3,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  },
                },
                arrow: {
                  sx: {
                    color: 'background.paper',
                    '&::before': {
                      border: '1px solid',
                      borderColor: 'divider',
                    },
                  },
                },
              }}
            >
              <InfoOutlinedIcon sx={{
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: isTaskClosed ? 'text.disabled' : 'action.active',
                '&:hover': { color: 'primary.main' }
              }} />
            </Tooltip>
          </Box>

          {/* Блок с датой дедлайна / кнопкой "Завершить" */}
          <Box
            sx={{
              flexBasis: '45%',
              textAlign: 'right',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              minHeight: '24px',
            }}
            onMouseEnter={() => setIsDeadlineHovered(true)}
            onMouseLeave={() => setIsDeadlineHovered(false)}
          >
            {/* Условие для показа кнопки "Завершить" */}
            {showInteractionButtons && isDeadlineHovered && !isTaskClosed && (task.status === 'accepted' || task.status === 'in_progress') ? (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={handleCompleteTask}
                disabled={isCompleting}
                sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative' }}
              >
                {isCompleting ? <CircularProgress size={12} sx={{ color: 'success.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'Завершить'}
              </Button>
            ) : ( // Иначе показываем дату дедлайна
              <Tooltip title={`Дедлайн: ${formatDateTime(task.deadline)}`} placement="bottom-end">
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatDateTime(task.deadline)}
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* --- БЛОК С ИНФОРМАЦИЕЙ О СВЯЗАННОЙ СДЕЛКЕ --- */}
        <Box sx={{ mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(0,0,0,0.08)', fontSize: '0.7rem', textAlign: 'left', px: 0.5, minHeight: '20px' /* Чтобы блок не исчезал, если сделки нет */ }}>
          {task.deal && task.deal_details?.name ? ( // Если есть ID сделки и детали сделки (название)
            <Typography variant="caption" component="div" sx={{ fontSize: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {/* Ссылка на страницу сделки */}
              <MuiLink 
                component={RouterLink} // Используем RouterLink для внутренней навигации
                to={`/deals/${task.deal}`} // Путь к сделке
                variant="caption"
                sx={{ 
                  fontSize: 'inherit', 
                  fontWeight: 'normal',
                  textDecoration: 'none',
                  color: 'text.primary', // Цвет ссылки
                  '&:hover': { 
                    textDecoration: 'underline',
                    color: 'text.primary',
                  } 
                }}
                onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие события
              >
                {task.deal_details.name} {/* Название сделки */}
              </MuiLink>
            </Typography>
          ) : ( // Если сделка не указана
            <Typography variant="caption" component="div" sx={{ fontSize: 'inherit', color: 'text.disabled' }}>
              Сделка: -
            </Typography>
          )}
        </Box>

      </CardContent>
    </Card>
  );
};

export default TaskCard;
