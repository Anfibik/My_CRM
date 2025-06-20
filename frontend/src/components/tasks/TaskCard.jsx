// --- ИМПОРТЫ ---
import React, { useState } from 'react';
// Импорты компонентов Material UI для построения интерфейса карточки
import { Card, CardContent, Typography, Box, Tooltip, Divider, Button, CircularProgress, Link as MuiLink, IconButton } from '@mui/material';
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
// Импорт темы Material UI
import { useTheme } from '@mui/material/styles';
import InfoTooltipIcon from '../common/InfoTooltipIcon';
// Импорт библиотеки date-fns для форматирования дат
import formatDateFns from 'date-fns/format';
// Импорт русской локали для date-fns
import ru from 'date-fns/locale/ru';
import { useAuth } from '../../context/AuthContext'; // Добавлен импорт useAuth

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ (УРОВЕНЬ МОДУЛЯ) ---
// Форматирует дату и время в удобочитаемый вид (дд.мм.гг)
const formatDateTimeModule = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      // Попытка распарсить как ISO строку, если стандартный парсинг не удался
      const isoDateString = dateTimeString.includes(' ') ? dateTimeString.replace(' ', 'T') : dateTimeString;
      const parsedDate = new Date(isoDateString);
      if (isNaN(parsedDate.getTime())) {
        console.warn(`Invalid date/time string received, unable to parse: ${dateTimeString}`);
        return 'Некорр. дата';
      }
      return formatDateFns(parsedDate, 'dd.MM.yy', { locale: ru });
    }
    return formatDateFns(date, 'dd.MM.yy', { locale: ru });
  } catch (error) {
    console.error("Error formatting date with formatDateTimeModule:", error, "Input:", dateTimeString);
    return "Ошибка даты";
  }
};

// --- КОМПОНЕНТ TaskCard ---
// task: объект задачи
// provided: объект от react-beautiful-dnd для drag-and-drop (если карточка перетаскиваемая)
// isDragging: флаг, указывающий, перетаскивается ли карточка в данный момент
// showInteractionButtons: флаг, показывать ли кнопки взаимодействия (Принять/Завершить) при наведении
// onTaskUpdate: функция обратного вызова для обновления задачи в родительском компоненте
const TaskCard = ({ task, provided, isDragging = false, showInteractionButtons = true, onTaskUpdate }) => {
  const { user: currentUser } = useAuth(); // Получаем currentUser
  const theme = useTheme(); // Добавляем theme
  // --- ХУКИ И СОСТОЯНИЕ ---
  const navigate = useNavigate(); // Хук для программной навигации
  // Состояния для отслеживания наведения мыши на элементы (для показа кнопок)
  const [isCreateDateHovered, setIsCreateDateHovered] = useState(false);
  const [isDeadlineHovered, setIsDeadlineHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Состояние для отслеживания загрузки при API-запросах

  // Определение ролей пользователя для задачи
  const isAuthor = currentUser && typeof task.author !== 'undefined' && task.author === currentUser.id;
  const isAssignee = currentUser && typeof task.assignee !== 'undefined' && task.assignee === currentUser.id;
  const isParticipant = currentUser && Array.isArray(task.participants) && task.participants.includes(currentUser.id);
  const isObserver = currentUser && !isAuthor && !isAssignee && !isParticipant;

  // Состояния для отслеживания процесса выполнения API-запросов (принятие/завершение задачи)
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStartingProgress, setIsStartingProgress] = useState(false);

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
      const response = await api.patch(`/api/tasks/${task.id}/`, { status: 'accepted' });
      const updatedTaskFromServer = response.data; // Получаем обновленную задачу от сервера

      // Если есть функция обратного вызова, вызываем ее для обновления UI
      if (onTaskUpdate) {
        onTaskUpdate(updatedTaskFromServer); // Передаем обновленную задачу от сервера
      }
    } catch (err) {
      console.error(`Error updating task ${task.id} to accepted:`, err);
      // Здесь можно добавить обработку ошибок, например, показать уведомление пользователю
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
      const response = await api.patch(`/api/tasks/${task.id}/`, { status: 'completed' });
      const updatedTaskFromServer = response.data; // Получаем обновленную задачу от сервера

      if (onTaskUpdate) {
        onTaskUpdate(updatedTaskFromServer); // Передаем обновленную задачу от сервера
      }
    } catch (err) {
      console.error(`Error updating task ${task.id} to completed:`, err);
      // Здесь можно добавить обработку ошибок, например, показать уведомление пользователю
    } finally {
      setIsCompleting(false);
      setIsDeadlineHovered(false);
    }
  };

  const handleStartProgress = async (e) => {
    e.stopPropagation();
    if (!task || !task.id) {
      console.error("ID задачи не найден, не могу начать выполнение.");
      return;
    }
    setIsStartingProgress(true);
    try {
          const response = await api.patch(`/api/tasks/${task.id}/`, { status: 'in_progress' });
      if (onTaskUpdate) {
        onTaskUpdate(response.data);
      }
    } catch (error) {
      console.error("Ошибка при переводе задачи в работу:", error);
    } finally {
      setIsStartingProgress(false);
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
        // Логика для рамок с приоритетами:
        ...(task.status === 'completed' ? { // 1. Наивысший приоритет: Выполненные задачи
          border: `2px solid ${theme.palette.success.main}`,
          borderColor: theme.palette.success.main,
        } : task.priority === 'high' ? { // 2. Затем: Задачи с высоким приоритетом (если не 'completed')
          border: `3px solid ${theme.palette.error.main}`,
          borderColor: theme.palette.error.main,
        } : task.task_type === 'step' ? { // 3. Затем: Задачи типа "шаг воронки" (если не 'completed' и не 'high priority')
          border: `2px solid #FFC107`, // Желтая рамка
          borderColor: '#FFC107',
        } : { // 4. По умолчанию (если ни одно из вышеперечисленных условий не выполнено)
          border: `1px solid ${theme.palette.divider}`, // Стандартная рамка
          borderColor: theme.palette.divider,
        })
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
            {showInteractionButtons && isCreateDateHovered && !isTaskClosed ? (
              task.status === 'not_accepted' || task.status === 'pending' ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  onClick={handleAcceptTask}
                  disabled={isObserver || isAuthor || isAccepting}
                  sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative', lineHeight: 'normal' }}
                >
                  {isAccepting ? <CircularProgress size={12} sx={{ color: 'secondary.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'Принять'}
                </Button>
              ) : task.status === 'accepted' ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleStartProgress}
                  disabled={isObserver || isAuthor || isStartingProgress}
                  sx={{ fontSize: '0.55rem', p: '2px 4px', minWidth: 'auto', position: 'relative', lineHeight: 'normal' }}
                >
                  {isStartingProgress ? <CircularProgress size={12} sx={{ color: 'primary.main', position: 'absolute', top: '50%', left: '50%', marginTop: '-6px', marginLeft: '-6px' }} /> : 'В работу'}
                </Button>
              ) : (
                <Tooltip title={`Создана: ${formatDateTime(task.created_at)}`} placement="bottom-start">
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {formatDateTime(task.created_at)}
                  </Typography>
                </Tooltip>
              )
            ) : (
              <Tooltip title={`Создана: ${formatDateTime(task.created_at)}`} placement="bottom-start">
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {formatDateTime(task.created_at)}
                </Typography>
              </Tooltip>
            )}
          </Box>

          {/* Иконка информации с всплывающей подсказкой (название и описание задачи) */}
          <Box sx={{ flexBasis: '10%', textAlign: 'center' }}>
            <InfoTooltipIcon title={task.title} description={task.description} />
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
            {showInteractionButtons && isDeadlineHovered && !isTaskClosed && task.status === 'in_progress' ? (
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={handleCompleteTask}
                disabled={isObserver || isAuthor || isCompleting}
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

// --- НОВЫЙ КОМПОНЕНТ CompactTaskCard ---
export const CompactTaskCard = ({ task, onClick }) => {
  const theme = useTheme();
  if (!task) return null;

  const StatusIconComponent = getStatusIcon(task.status);
  const taskTypeLabel = getTaskTypeLabel(task.task_type);
  const statusLabelText = getStatusLabel(task.status);
  const dateToFormat = task.status_updated_at || task.updated_at;
  const updatedDate = formatDateTimeModule(dateToFormat);

  const actualColorForContrastCalculation = theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300];
  const cardSxBgStyle = actualColorForContrastCalculation;

  let iconAndButtonTextColor;
  try {
    iconAndButtonTextColor = theme.palette.getContrastText(actualColorForContrastCalculation);
  } catch (error) {
    console.warn(`CompactTaskCard: Could not get contrast text for '${actualColorForContrastCalculation}'. Falling back to theme's primary text color.`, error);
    iconAndButtonTextColor = theme.palette.text.primary;
  }

  const verticalTextStyle = {
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
    fontSize: '0.5rem',
    fontWeight: 500,
    textAlign: 'center',
    color: theme.palette.text.secondary,
    padding: '4px 0',
  };

  return (
    <Card
      sx={{
        width: '25px',
        height: '100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0px',
        opacity: 0.6,
        backgroundColor: cardSxBgStyle,
        border: `1px solid ${theme.palette.divider}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: theme.shadows[3],
        }
      }}
      onClick={onClick}
    >
      <Tooltip title={`${statusLabelText} - ${updatedDate}`} placement="top">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', paddingTop: '4px' }}>
          {StatusIconComponent ? React.cloneElement(StatusIconComponent, {
            sx: {
              fontSize: '1.25rem',
              color: iconAndButtonTextColor
            }
          }) : <Box sx={{ width: '1.25rem', height: '1.25rem' }} /> /* Placeholder if no icon */}
        </Box>
      </Tooltip>

      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <Typography sx={verticalTextStyle}>
          {taskTypeLabel}
        </Typography>
      </Box>


      {/* Иконка информации с всплывающей подсказкой (название и описание задачи) */}
      <Box sx={{ flexBasis: '10%', textAlign: 'center' }}>
        <InfoTooltipIcon title={task.title} description={task.description} />
      </Box>



    </Card>
  );
};


// --- Горизонтальные карточки задач для канбана---
export const GorizontalCompactTaskCard = ({ task, onClick }) => {
  const theme = useTheme();
  if (!task) return null;

  const StatusIconComponent = getStatusIcon(task.status);
  const taskTypeLabel = getTaskTypeLabel(task.task_type);
  const statusLabelText = getStatusLabel(task.status);
  const dateToFormat = task.status_updated_at || task.updated_at;
  const updatedDate = formatDateTimeModule(dateToFormat);

  const actualColorForContrastCalculation = theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300];
  const cardSxBgStyle = actualColorForContrastCalculation;

  let iconAndButtonTextColor;
  try {
    iconAndButtonTextColor = theme.palette.getContrastText(actualColorForContrastCalculation);
  } catch (error) {
    console.warn(`CompactTaskCard: Could not get contrast text for '${actualColorForContrastCalculation}'. Falling back to theme's primary text color.`, error);
    iconAndButtonTextColor = theme.palette.text.primary;
  }

  const verticalTextStyle = {
    writingMode: 'vertical-rl',
    textOrientation: 'mixed',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
    fontSize: '0.5rem',
    fontWeight: 500,
    textAlign: 'center',
    color: theme.palette.text.secondary,
    padding: '4px 0',
  };

  return (
    <Card
      sx={{
        width: '100px',
        height: '25px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0px',
        opacity: 0.6,
        backgroundColor: cardSxBgStyle,
        border: `1px solid ${theme.palette.divider}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: theme.shadows[3],
        }
      }}
      onClick={onClick}
    >
      <Tooltip title={`${statusLabelText} - ${updatedDate}`} placement="top">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', paddingTop: '4px' }}>
          {StatusIconComponent ? React.cloneElement(StatusIconComponent, {
            sx: {
              fontSize: '1.25rem',
              color: iconAndButtonTextColor
            }
          }) : <Box sx={{ width: '1.25rem', height: '1.25rem' }} /> /* Placeholder if no icon */}
        </Box>
      </Tooltip>

      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <Typography sx={verticalTextStyle}>
          {taskTypeLabel}
        </Typography>
      </Box>


      {/* Иконка информации с всплывающей подсказкой (название и описание задачи) */}
      <Box sx={{ flexBasis: '10%', textAlign: 'center' }}>
        <InfoTooltipIcon title={task.title} description={task.description} />
      </Box>



    </Card>
  );
};


