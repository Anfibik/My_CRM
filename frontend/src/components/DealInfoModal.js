// src/components/DealInfoModal.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

const DealInfoModal = ({ deal, onClose }) => {
  const navigate = useNavigate();

  // Функция для перехода на детальную страницу
  const handleDetail = () => {
    onClose(); // закрываем модальное окно
    navigate(`/deals/${deal.id}`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-2">Детали сделки (быстрый просмотр)</h3>
        <p><strong>ID сделки:</strong> {deal.id}</p>
        <p><strong>Название сделки:</strong> {deal.name || "Без названия"}</p>
        <p><strong>Департамент:</strong> {deal.department || "Не указан"}</p>
        <p><strong>Статус сделки:</strong> {deal.status}</p>
        <p><strong>Проверенная потребность:</strong> {deal.validated_need}</p>
        {/* Можно добавить дополнительные поля, если потребуется */}
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">
            Закрыть
          </button>
          <button onClick={handleDetail} className="bg-blue-500 text-white px-4 py-2 rounded">
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealInfoModal;
