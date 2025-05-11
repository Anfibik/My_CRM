import api from './config';

const USERS_ENDPOINT = '/api/users/';

/**
 * Получить список пользователей.
 * @param {string} [department] - фильтр по департаменту
 * @returns {Promise<Array>} - массив пользователей
 */
export const getUsers = async (department) => {
  try {
    let url = USERS_ENDPOINT;
    if (department) {
      url += `?department=${department}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    throw error;
  }
};
