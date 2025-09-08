// src/components/NextStepPopup.js
import React, { useState } from 'react';

const NextStepPopup = ({ isOpen, onClose, onSubmit, onSave }) => {
    const [nextStepText, setNextStepText] = useState("");
    const [nextStepDateTime, setNextStepDateTime] = useState("");
    const [createTask, setCreateTask] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(nextStepText, nextStepDateTime, createTask);
        if (onSave) onSave(nextStepText, nextStepDateTime, createTask);
        setNextStepText("");
        setNextStepDateTime("");
        setCreateTask(true); // Сбрасываем в true для следующего использования
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Введите следующий шаг</h2>
                <textarea
                    className="w-full p-2 border rounded mb-4"
                    rows="4"
                    placeholder="Опишите следующий шаг..."
                    value={nextStepText}
                    onChange={(e) => setNextStepText(e.target.value)}
                />
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Дата и время выполнения</label>
                    <input
                        type="datetime-local"
                        className="w-full p-2 border rounded mb-2"
                        value={nextStepDateTime}
                        onChange={(e) => setNextStepDateTime(e.target.value)}
                    />
                </div>
                <div className="mb-4 flex items-center">
                    <input
                        type="checkbox"
                        id="createTaskCheckbox"
                        checked={createTask}
                        onChange={(e) => setCreateTask(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="createTaskCheckbox" className="ml-2 text-sm text-gray-700">
                        Поставить задачу
                    </label>
                </div>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => {
                            setNextStepText("");
                            onClose();
                        }}
                        className="bg-gray-300 text-black px-4 py-2 rounded"
                    >
                        Закрыть
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!nextStepText.trim() || !nextStepDateTime}
                        className={`px-4 py-2 rounded ${
                            !nextStepText.trim() || !nextStepDateTime
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-blue-500 text-white"
                        }`}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NextStepPopup;
