import React, { useEffect, useState } from 'react';
import api from '../api/config';
import EmployeeAssignmentModal from '../components/common/EmployeeAssignmentModal';
import LeadDataForm from '../components/leads/LeadDataForm';
import { PHONE_TYPE_LABELS } from '../constants';

const InquiryListPage = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Состояния для формы создания обращения теперь управляются LeadDataForm
    const [showEmployeeModal, setShowEmployeeModal] = useState(false); // флаг для показа модального окна выбора сотрудников
    const [currentInquiryId, setCurrentInquiryId] = useState(null);    // ID обращения, которое собираемся конвертировать
    const [selectedDepartments, setSelectedDepartments] = useState([]);  // Массив отделов, выбранных в обращении (из inquiry.products)


     

    // Словарь для отображения человекочитаемого статуса
    const statusMap = {
        pending: "В ожидании",
        in_progress: "В работе",
        archived: "В архиве"
    };

    // Функция загрузки обращений с сервера
    const fetchInquiries = async () => {
        try {
            const response = await api.get('/api/inquiries/');
            setInquiries(Array.isArray(response.data) ? response.data : response.data.results || []);
        } catch (error) {
            console.error("Ошибка при получении обращений:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInquiries();
    }, []);

    //обработчик нажатия на кнопку "В работу"
    const handleConvertClick = (inquiry) => {
        console.log("Нажата кнопка 'В работу' для обращения:", inquiry.id);
        setCurrentInquiryId(inquiry.id);
        setSelectedDepartments(inquiry.departments || []); // products - массив отделов
        setShowEmployeeModal(true);
    };



    // Функция удаления обращения
    const handleDelete = async (id) => {
        try {
            await api.delete(`/api/inquiries/${id}/`);
            setInquiries(inquiries.filter((inquiry) => inquiry.id !== id));
        } catch (error) {
            console.error("Ошибка при удалении обращения:", error);
        }
    };

    // Функция отправления в архив
    const handleArchive = async (id) => {
        try {
            await api.patch(`/api/inquiries/${id}/`, { status: "archived" });
            fetchInquiries();
        } catch (error) {
            console.error("Ошибка при архивировании обращения:", error);
            alert("Не удалось отправить в архив");
        }
    };

    // Функция активации (возвращения из архива)
    const handleActivate = async (id) => {
        try {
            await api.patch(`/api/inquiries/${id}/`, { status: "pending" });
            fetchInquiries();
        } catch (error) {
            console.error("Ошибка при активации обращения:", error);
            alert("Не удалось активировать обращение");
        }
    };


    // const handleConvert = async (id) => {
    //     try {
    //         const response = await api.post(`http://127.0.0.1:8000/api/inquiries/${id}/convert/`);
    //         alert(response.data.detail);
    //         // Например, "Обращение успешно конвертировано"
    //         // Если нужно, можно обновить список обращений или статус
    //         fetchInquiries();
    //     } catch (error) {
    //         console.error("Ошибка при конвертации обращения:", error);
    //         alert("Не удалось конвертировать обращение");
    //     }
    // };

    const handleConvertWithAssignments = async (inquiryId, assignments) => {
        try {
            const response = await api.post(`/api/inquiries/${inquiryId}/convert/`, {
                department_assignments: assignments
            });
            alert(response.data.detail);
            fetchInquiries(); // обновить список обращений
        } catch (error) {
            console.error("Ошибка при конвертации обращения:", error);
            alert("Не удалось конвертировать обращение.");
        }
    };

    // Функция отправки формы создания нового обращения (данные приходят из LeadDataForm)
    const handleCreateInquiry = async (formData) => {
        console.log('InquiryListPage handleCreateInquiry, formData received:', formData);
        const inquiryData = {
            full_name: formData.fullName,
            phone_numbers: formData.phone_numbers, // Используем массив номеров
            email: formData.email,
            messenger: formData.messenger,
            company_name: formData.companyName,
            company_site: formData.companySite,
            need_description: formData.needDescription,
            departments: formData.selectedProducts, // Ключ изменен на 'departments' для соответствия модели Inquiry
            status: "pending",
        };

        console.log('InquiryListPage handleCreateInquiry, inquiryData to send:', inquiryData);
        try {
            await api.post('/api/inquiries/', inquiryData);
            setShowModal(false); // Закрываем модальное окно
            fetchInquiries(); // Обновляем список обращений
            // TODO: Добавить уведомление об успешном создании (например, через toast)
        } catch (error) {
            console.error("Ошибка при создании обращения:", error);
            // TODO: Добавить уведомление об ошибке (например, через toast)
        }
    };

    if (loading) {
        return <p>Загрузка обращений...</p>;
    }

    return (
        <div className="max-w-3xl mx-auto p-6 bg-gray-100 min-h-screen relative">
            <h2 className="text-2xl font-bold mb-4">Обращения</h2>
            <button
                onClick={() => setShowModal(true)}
                className="bg-green-500 text-white px-4 py-2 rounded mb-4"
            >
                Создать обращение
            </button>
            <ul className="space-y-4">
                {inquiries.map((inquiry) => {

                    const dateObj = new Date(inquiry.created_at);
                    const formattedDate = dateObj.toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    // Определяем, архивировано ли обращение
                    const isArchived = inquiry.status === "archived";

                    // Стили для карточки (если архив, делаем серую и полупрозрачную)
                    let cardClass = "p-4 shadow rounded-md";
                    if (inquiry.status === "archived") {
                        cardClass += " bg-gray-300 opacity-70";
                    } else if (inquiry.status === "pending") {
                        cardClass += " bg-yellow-100";
                    } else if (inquiry.status === "in_progress") {
                        cardClass += " bg-green-100";
                    } else {
                        cardClass += " bg-white";
                    }

                    return (
                        <li key={inquiry.id} className={cardClass + " flex justify-between items-center space-x-4"}>
                            <div className="flex-1 min-w-0">
                                <p><strong>{inquiry.full_name}</strong> 
                                   ({(() => {
                                           const workPrimaryPhone = inquiry.phone_numbers?.find(p => p.phone_type === 'WORK_PRIMARY');
                                           if (workPrimaryPhone) {
                                               return `${workPrimaryPhone.phone_number} (${PHONE_TYPE_LABELS[workPrimaryPhone.phone_type] || workPrimaryPhone.phone_type})`;
                                           }
                                           return 'Телефон не указан';
                                       })()})
                                </p>
                                <p>Компания: {inquiry.company_name || "Не указана"}</p>
                                <p className="truncate">{inquiry.need_description}</p>
                                <p>Статус: {statusMap[inquiry.status] ?? inquiry.status}</p>
                                <p>Дата обращения: {formattedDate}</p>
                                <p>Оператор: {inquiry.responsible ? inquiry.responsible.full_name : 'Не назначен'}</p>
                                
                            </div>
                            <div className="flex flex-col space-y-2">
                                {isArchived ? (
                                    // Если обращение в архиве, показываем "Активировать"
                                    <button
                                        onClick={() => handleActivate(inquiry.id)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded"
                                    >
                                        Активировать
                                    </button>
                                ) : (
                                    // Если не архивировано, показываем "В архив" и "Конвертировать"
                                    <>
                                        <button
                                            onClick={() => handleArchive(inquiry.id)}
                                            className="bg-gray-500 text-white px-3 py-1 rounded"
                                        >
                                            В архив
                                        </button>
                                        {inquiry.status === "pending" && (
                                            <button
                                                onClick={() => handleConvertClick(inquiry)}
                                                className="bg-blue-500 text-white px-3 py-1 rounded"
                                            >
                                                В работу
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
                    <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Создать обращение</h3>
                        <LeadDataForm 
                            onSubmit={handleCreateInquiry}
                            onCancel={() => setShowModal(false)}
                            initialData={{ 
                                fullName: "", 
                                phone_numbers: [{ phone_number: "+380", type: "WORK_PRIMARY" }], 
                                email: "", 
                                messenger: "", 
                                companyName: "", 
                                companySite: "https://", 
                                needDescription: "", 
                                selectedProducts: [] 
                            }}
                        />
                    </div>
                </div>
            )}

            {showEmployeeModal && (
                <EmployeeAssignmentModal
                    isOpen={showEmployeeModal}
                    departments={selectedDepartments}
                    onClose={() => setShowEmployeeModal(false)}
                    onSave={(assignments) => {
                        // Здесь assignments — объект вида: { "Отдел": employeeId, ... }
                        console.log("Выбранные сотрудники:", assignments);
                        // После выбора сотрудников можно вызвать функцию для конвертации обращения с этим маппингом:
                        handleConvertWithAssignments(currentInquiryId, assignments);
                        setShowEmployeeModal(false);
                    }}
                />
            )}

        </div>
    );
};

export default InquiryListPage;
