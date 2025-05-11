import api from './config';

const AUTH_ENDPOINT = '/api/auth';

export const login = async (credentials) => {
  try {
    const response = await api.post(`${AUTH_ENDPOINT}/login`, credentials);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    return { token, user };
  } catch (error) {
    console.error('Ошибка при входе:', error);
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post(`${AUTH_ENDPOINT}/register`, userData);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    return { token, user };
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    throw error;
  }
};

export const logout = () => {
  try {
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  }
};

export const refreshToken = async () => {
  try {
    const response = await api.post(`${AUTH_ENDPOINT}/refresh`);
    const { token } = response.data;
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get(`${AUTH_ENDPOINT}/me`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    throw error;
  }
}; 