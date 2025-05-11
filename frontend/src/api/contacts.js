import api from './config';

const CONTACTS_ENDPOINT = '/api/contacts/';

export const getContacts = async () => {
  try {
    const response = await api.get(CONTACTS_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении контактов:', error);
    throw error;
  }
};

export const createContact = async (contactData) => {
  try {
    const response = await api.post(CONTACTS_ENDPOINT, contactData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при создании контакта:', error);
    throw error;
  }
};

export const deleteContact = async (contactId) => {
  try {
    await api.delete(`${CONTACTS_ENDPOINT}${contactId}/`);
  } catch (error) {
    console.error('Ошибка при удалении контакта:', error);
    throw error;
  }
};

export const updateContact = async (contactId, contactData) => {
  try {
    const response = await api.put(`${CONTACTS_ENDPOINT}${contactId}/`, contactData);
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении контакта:', error);
    throw error;
  }
};
