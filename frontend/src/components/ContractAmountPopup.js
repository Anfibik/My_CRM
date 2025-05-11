import React, { useState } from 'react';

const ContractAmountPopup = ({ isOpen, onClose, onSubmit }) => {
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    if (numericAmount > 0) {
      onSubmit(numericAmount);
      setAmount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Введите сумму сделки</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded mb-4"
          placeholder="Введите сумму"
        />
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 bg-gray-300 px-4 py-2 rounded"
          >
            Закрыть
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`bg-blue-500 text-white px-4 py-2 rounded ${
              !amount || parseFloat(amount) <= 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractAmountPopup;
