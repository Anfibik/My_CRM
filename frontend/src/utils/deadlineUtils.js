// frontend/src/utils/deadlineUtils.js

/**
 * Рассчитывает оставшиеся рабочие часы до дедлайна.
 * Учитываются только рабочие дни (Пн-Пт) и рабочие часы (9:00-18:00).
 * @param {string} deadlineString - Строка с датой и временем дедлайна.
 * @returns {number|Infinity} - Количество оставшихся рабочих часов или Infinity, если дедлайн не указан.
 */
const calculateRemainingWorkHours = (deadlineString) => {
  if (!deadlineString) return Infinity;

  const now = new Date();
  const deadline = new Date(deadlineString);

  if (deadline < now) return 0; // Дедлайн прошел

  let remainingHours = 0;
  let currentDate = new Date(now);
  
  // Приводим текущее время к началу следующего часа для корректного отсчета полных часов
  currentDate.setMinutes(0, 0, 0); 
  currentDate.setHours(currentDate.getHours() + 1);

  while (currentDate <= deadline) {
    const dayOfWeek = currentDate.getDay(); // 0 (Вс) - 6 (Сб)
    const hours = currentDate.getHours();   // Час начала слота

    // Проверяем, является ли день рабочим (1-5 = Пн-Пт) и является ли время рабочим (9-17 = 9:00-18:00)
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && hours >= 9 && hours < 18) {
      remainingHours++;
    }
    currentDate.setHours(currentDate.getHours() + 1);
  }
  return remainingHours;
};

/**
 * Возвращает информацию для отображения дедлайна.
 * @param {string} deadlineString - Строка с датой и временем дедлайна.
 * @returns {object} - Объект с информацией о дедлайне:
 *   {
 *     text: string,        // Текстовое описание (напр. "Осталось 5 ч", "Просрочено")
 *     color: string,       // Цвет для отображения (напр. 'error.main', 'warning.main')
 *     iconName: string,    // Имя иконки (напр. 'AccessTime', 'Warning', 'CalendarToday')
 *     remainingHours: number // Количество оставшихся рабочих часов (или Infinity)
 *   }
 */
export const getDeadlineInfo = (deadlineString) => {
  if (!deadlineString) {
    return {
      text: 'Дедлайн не указан',
      color: 'grey.500',
      iconName: 'CalendarToday', // Или 'AccessTime' если так привычнее для "не указан"
      remainingHours: Infinity,
    };
  }

  const remainingHours = calculateRemainingWorkHours(deadlineString);

  if (remainingHours === 0 && new Date(deadlineString) < new Date()) {
    return {
      text: 'Просрочено',
      color: 'error.main',
      iconName: 'Warning',
      remainingHours: 0,
    };
  }

  if (remainingHours <= 2) {
    return {
      text: `Осталось ${remainingHours} ч`,
      color: 'error.main',
      iconName: 'Warning', // Критично
      remainingHours,
    };
  }

  if (remainingHours <= 10) {
    return {
      text: `Осталось ${remainingHours} ч`,
      color: 'warning.main',
      iconName: 'AccessTime', // Предупреждение
      remainingHours,
    };
  }

  return {
    text: `Осталось ${remainingHours} ч`,
    color: 'grey.500', // Стандартный цвет для обычного состояния
    iconName: 'CalendarToday', // Нормальное состояние
    remainingHours,
  };
};
