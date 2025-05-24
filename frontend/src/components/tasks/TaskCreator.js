import api from '../../api/config'; // Убедитесь, что путь к вашему axios инстансу (api) верный
import eventBus from '../../utils/eventBus'; // Исправленный путь, если используется для уведомлений

/**
 * Создает новую задачу.
 * @param {object} taskDetails - Детали задачи.
 * @param {string} taskDetails.title - Заголовок задачи (обязательно).
 * @param {string} taskDetails.description - Описание задачи (обязательно).
 * @param {number|string} taskDetails.dealId - ID связанной сделки (обязательно).
 * @param {string} [taskDetails.priority='low'] - Приоритет ('low', 'high').
 * @param {string} [taskDetails.taskType='universal'] - Тип задачи (из TASK_TYPE_CHOICES бэкенда).
 * @param {string} [taskDetails.deadline] - Дедлайн в формате ISO строки (YYYY-MM-DDTHH:mm).
 * @param {number|string} [taskDetails.executorId] - ID исполнителя.
 * @param {Array<number|string>} [taskDetails.participantIds] - Массив ID участников.
 * @param {Array<number|string>} [taskDetails.observerIds] - Массив ID наблюдателей.
 * @param {string} [taskDetails.status='not_accepted'] - Статус задачи.
 * @returns {Promise<object>} - Промис с данными созданной задачи от сервера.
 * @throws {Error} - Если произошла ошибка валидации на клиенте или ошибка API.
 */
export const createTask = async (taskDetails) => {
  // 1. Валидация обязательных полей на клиенте
  if (!taskDetails.title || taskDetails.title.trim() === '') {
    const errorMsg = 'Название задачи (title) является обязательным полем.';
    // eventBus.emit('show-alert', { message: errorMsg, type: 'error' }); // Пример уведомления
    throw new Error(errorMsg);
  }
  if (!taskDetails.description || taskDetails.description.trim() === '') {
    const errorMsg = 'Описание задачи (description) является обязательным полем.';
    // eventBus.emit('show-alert', { message: errorMsg, type: 'error' });
    throw new Error(errorMsg);
  }
  if (taskDetails.dealId === undefined || taskDetails.dealId === null || String(taskDetails.dealId).trim() === '') {
    const errorMsg = 'ID сделки (dealId) является обязательным полем.';
    // eventBus.emit('show-alert', { message: errorMsg, type: 'error' });
    throw new Error(errorMsg);
  }

  // 2. Формирование payload для API
  const payload = {
    title: taskDetails.title.trim(),
    description: taskDetails.description.trim(),
    deal: taskDetails.dealId, // На бэкенде ожидается поле 'deal'
  };

  // Добавление опциональных полей, если они предоставлены
  if (taskDetails.priority) {
    payload.priority = taskDetails.priority;
  }
  if (taskDetails.taskType) {
    payload.task_type = taskDetails.taskType; // На бэкенде 'task_type'
  }
  if (taskDetails.deadline) {
    // Убедимся, что дедлайн в корректном формате, если нужно
    // Например, если приходит объект Date, его нужно преобразовать в ISO строку
    // Если уже строка, можно добавить валидацию формата
    payload.deadline = taskDetails.deadline;
  }
  if (taskDetails.executorId !== undefined && taskDetails.executorId !== null) {
    payload.executor = taskDetails.executorId; // На бэкенде 'executor'
  }
  if (taskDetails.participantIds && taskDetails.participantIds.length > 0) {
    payload.participants = taskDetails.participantIds;
  }
  if (taskDetails.observerIds && taskDetails.observerIds.length > 0) {
    payload.observers = taskDetails.observerIds;
  }
  if (taskDetails.status) {
    payload.status = taskDetails.status;
  }

  // 3. Выполнение API запроса
  try {
    console.log('Отправка данных для создания задачи:', payload); // Для дебага
    const response = await api.post('/api/tasks/', payload);
    // eventBus.emit('show-alert', { message: 'Задача успешно создана!', type: 'success' });
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании задачи:', error.response ? error.response.data : error.message);
    const errorMessage = error.response?.data?.detail || 
                         (typeof error.response?.data === 'object' ? JSON.stringify(error.response.data) : 'Не удалось создать задачу.');
    // eventBus.emit('show-alert', { message: `Ошибка: ${errorMessage}`, type: 'error' });
    throw new Error(`API Error: ${errorMessage}`);
  }
};

// Можно добавить и другие функции, связанные с задачами, если потребуется в будущем
// export const updateTask = async (taskId, taskUpdateDetails) => { ... };
// export const deleteTask = async (taskId) => { ... };