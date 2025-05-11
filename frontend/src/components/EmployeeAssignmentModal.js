import React, { useState, useEffect } from 'react';
import api from '../api/config';

const EmployeeAssignmentModal = ({ isOpen, onClose, departments, onSave }) => {
    // assignments — объект, где ключ: отдел, значение: выбранный сотрудник (ID)
    const [assignments, setAssignments] = useState({});
    // employeesByDept — объект, где ключ: отдел, значение: массив сотрудников данного отдела
    const [employeesByDept, setEmployeesByDept] = useState({});

    const departmentKeyMap  = {
        "ШМБ": "warehouses",
        "Стеллажные системы": "racks",
        "Складсая техника": "warehouses_machines",
        "Пластиковая тара": "plastic_containers",
        "Мусорные баки": "trash_bins",
        "Системы сортировки": "sorting_systems",
        "Автоматизация": "automation",
        "Сервисные услуги": "services",
    };


    // При открытии модального окна для каждого отдела загружаем сотрудников
    useEffect(() => {
        if (isOpen && departments && departments.length > 0) {
            departments.forEach(dept => {
                const deptKey = departmentKeyMap[dept];
                if (!deptKey) {
                    setEmployeesByDept(prev => ({ ...prev, [dept]: [] }));
                    return;
                }
                api.get(`/api/users/?department=${encodeURIComponent(deptKey)}`)
                    .then(response => {
                        setEmployeesByDept(prev => ({
                            ...prev,
                            [dept]: response.data
                        }));
                    })
                    .catch(error => {
                        console.error(`Ошибка загрузки сотрудников для отдела ${dept}:`, error);
                        setEmployeesByDept(prev => ({ ...prev, [dept]: [] }));
                    });
            });
        }
    }, [isOpen, departments]);

    // Проверяем, заполнены ли для всех отделов поля
    const isFormValid = departments.every(dept => assignments[dept]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Выберите ответственных сотрудников</h2>
                {departments.map((dept) => (
                    <div key={dept} className="mb-4">
                        <p className="font-semibold">{dept}</p>
                        <select
                            className="w-full p-2 border rounded"
                            value={assignments[dept] || ""}
                            onChange={(e) => {
                                setAssignments({
                                    ...assignments,
                                    [dept]: e.target.value
                                });
                            }}
                        >
                            <option value="">Выберите сотрудника</option>
                            {employeesByDept[dept] && employeesByDept[dept].map(employee => (
                                <option key={employee.id} value={employee.id}>
                                    {employee.full_name || employee.username}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 text-black px-4 py-2 rounded"
                    >
                        Закрыть
                    </button>
                    <button
                        onClick={() => onSave(assignments)}
                        disabled={!isFormValid}
                        className={`px-4 py-2 rounded ${isFormValid ? "bg-blue-500 text-white" : "bg-gray-400 text-gray-600 cursor-not-allowed"}`}
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeAssignmentModal;
