import api from './config';

const COMPANIES_ENDPOINT = '/api/companies/';

export const getCompanies = async () => {
  try {
    const response = await api.get(COMPANIES_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении компаний:', error);
    throw error;
  }
};

export const createCompany = async (companyData) => {
  try {
    const response = await api.post(COMPANIES_ENDPOINT, companyData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании компании:', error);
    throw error;
  }
};

export const deleteCompany = async (companyId) => {
  try {
    await api.delete(`${COMPANIES_ENDPOINT}${companyId}/`);
  } catch (error) {
    console.error('Ошибка при удалении компании:', error);
    throw error;
  }
};

export const updateCompany = async (companyId, companyData) => {
  try {
    const response = await api.put(`${COMPANIES_ENDPOINT}${companyId}/`, companyData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении компании:', error);
    throw error;
  }
};
