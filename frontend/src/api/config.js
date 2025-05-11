import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000',  // Исправляем порт на 8000
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Ошибка при подготовке запроса:', error);
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Обработка различных HTTP ошибок
      switch (error.response.status) {
        case 401:
          // Неавторизованный доступ
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('Необходима авторизация'));
          
        case 403:
          // Доступ запрещен
          console.error('Доступ запрещен');
          return Promise.reject(new Error('У вас нет прав для выполнения этого действия'));
          
        case 404:
          // Ресурс не найден
          console.error('Ресурс не найден:', error.config.url);
          return Promise.reject(new Error('Запрашиваемый ресурс не найден'));
          
        case 500:
          // Ошибка сервера
          console.error('Ошибка сервера');
          return Promise.reject(new Error('Внутренняя ошибка сервера'));
          
        default:
          console.error('Произошла ошибка:', error.response.status);
          return Promise.reject(new Error(`Ошибка ${error.response.status}: ${error.response.data?.message || 'Неизвестная ошибка'}`));
      }
    } else if (error.request) {
      // Ошибка сети
      console.error('Ошибка сети:', error.request);
      return Promise.reject(new Error('Не удалось подключиться к серверу. Проверьте подключение к интернету.'));
    } else {
      // Ошибка в настройках запроса
      console.error('Ошибка в настройках запроса:', error.message);
      return Promise.reject(new Error('Произошла ошибка при выполнении запроса'));
    }
  }
);

export default api; 