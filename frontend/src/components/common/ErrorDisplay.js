import React from 'react';

const ErrorDisplay = ({ error, onClose }) => {
  if (!error) return null;

  const getErrorMessage = () => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          return 'Неавторизованный доступ. Пожалуйста, войдите в систему.';
        case 403:
          return 'Доступ запрещен. У вас нет прав для выполнения этого действия.';
        case 404:
          return 'Ресурс не найден.';
        case 500:
          return 'Ошибка сервера. Пожалуйста, попробуйте позже.';
        default:
          return error.response.data?.message || 'Произошла ошибка при выполнении запроса.';
      }
    }
    return error.message || 'Произошла неизвестная ошибка.';
  };

  return (
    <div className="fixed top-0 right-0 m-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold">Ошибка</h3>
          <p>{getErrorMessage()}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay; 