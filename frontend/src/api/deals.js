import api from './config'; // Ваш основной экземпляр axios

/**
 * Добавляет пользователя к участникам сделки, если его там еще нет.
 * Бэкенд должен обрабатывать PATCH запрос на /api/deals/{dealId}/ с телом { participants: [..., userIdToAdd] }.
 * @param {string|number} dealId - ID сделки.
 * @param {string|number} userIdToAdd - ID пользователя (исполнителя задачи), которого нужно добавить.
 * @param {Array<string|number>} currentParticipantIds - Массив ID текущих участников сделки.
 * @returns {Promise<Object|null>} - Промис с обновленными данными сделки от API или null если пользователь уже участник или произошла ошибка.
 */
export const addParticipantToDealIfNeeded = async (dealId, userIdToAdd, currentParticipantIds) => {
  if (!dealId || !userIdToAdd) {
    console.warn('addParticipantToDealIfNeeded: Deal ID or User ID to add is missing. DealID:', dealId, 'UserID:', userIdToAdd);
    return null;
  }

  // Убедимся, что userIdToAdd это строка или число для корректного сравнения
  const userIdStrOrNum = typeof userIdToAdd === 'number' ? userIdToAdd : parseInt(userIdToAdd, 10);
  
  // Убедимся, что currentParticipantIds это массив ID (чисел или строк)
  const participantIds = Array.isArray(currentParticipantIds) ? currentParticipantIds.map(id => typeof id === 'number' ? id : parseInt(id, 10)) : [];

  if (participantIds.includes(userIdStrOrNum)) {
    // console.log(`User ${userIdToAdd} is already a participant in deal ${dealId}.`);
    return null; // Пользователь уже участник, ничего не делаем
  }

  const updatedParticipantIds = [...participantIds, userIdStrOrNum];

  try {
    const payload = { participants: updatedParticipantIds };
    const response = await api.patch(`/api/deals/${dealId}/`, payload);
    // console.log(`User ${userIdToAdd} successfully added to participants of deal ${dealId}.`, response.data);
    return response.data; // Возвращаем обновленные данные сделки
  } catch (error) {
    console.error(`Error adding participant ${userIdToAdd} to deal ${dealId}:`, error.response?.data || error.message);
    // Можно пробросить ошибку дальше или вернуть null/специальный объект ошибки
    // throw error; // или return { error: true, message: 'Failed to update participants' };
    return null;
  }
};
