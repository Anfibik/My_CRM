import React, { useState, useEffect } from 'react';
import LeadDataForm from '../components/leads/LeadDataForm';
import EmployeeAssignmentModal from '../components/common/EmployeeAssignmentModal';
import api from '../api/config';
import { Link } from 'react-router-dom'; // Добавлен импорт Link

const LeadListPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for manual lead creation modal
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1 for LeadDataForm, 2 for EmployeeAssignmentModal
  const [stepOneData, setStepOneData] = useState(null); // To store data from LeadDataForm
  // const [employeeAssignments, setEmployeeAssignments] = useState(null); // To store assignments from EmployeeAssignmentModal

  // Словарь для отображения человекочитаемого статуса
  const statusMap = {
    new: "Новый",
    in_progress: "В работе",
    // Pipedrive статусы, возможно, потребуются другие или расширение этого списка
    open: "Открыт", 
    won: "Выигран",
    lost: "Проигран",
    non_active: "Не активен", // Старый статус, оставлен для совместимости
  };

  // Функция для загрузки лидов
  const fetchLeads = async () => {
    try {
      const response = await api.get('/api/leads/');
      setLeads(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error("Ошибка при получении лидов:", error);
      setLeads([]); // Устанавливаем пустой массив в случае ошибки
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот лид? Это действие также может удалить связанные сделки и задачи.')) {
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Ошибка: Пользователь не аутентифицирован. Пожалуйста, войдите в систему.');
          setIsSubmitting(false);
          return;
        }
        await api.delete(`/api/leads/${leadId}/`, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });
        alert('Лид успешно удален.');
        fetchLeads(); // Обновляем список лидов
      } catch (error) {
        console.error('Ошибка при удалении лида:', error);
        alert('Ошибка при удалении лида. Подробности в консоли.');
      }
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateLeadModal = () => {
    setCurrentStep(1);
    setStepOneData(null);
    // setEmployeeAssignments(null);
    setShowCreateLeadModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateLeadModal(false);
    setStepOneData(null);
    // setEmployeeAssignments(null);
    setCurrentStep(1); // Reset to first step
  };

  // Called when LeadDataForm is submitted
  const handleLeadDataSubmit = (formData) => {
    console.log("Step 1 Data (LeadDataForm):", formData);
    setStepOneData(formData);
    setCurrentStep(2); // Move to employee assignment step
  };

  // Called when EmployeeAssignmentModal is saved
  const handleEmployeeAssignmentSave = async (assignments) => {
    setIsSubmitting(true);
    console.log("Step 2 Data (Employee Assignments):", assignments);
    // setEmployeeAssignments(assignments);

    if (!stepOneData) {
      console.error("Error: Data from step one is missing.");
      alert("Произошла ошибка, данные первого шага отсутствуют.");
      handleCloseModal();
      return;
    }

    const finalLeadPayload = {
      ...stepOneData, // fullName, phone, email, companyName, etc., selectedProducts
      assignments: assignments, // { "Department Name": employeeId, ... }
    };

    console.log("Final Lead Payload to send to backend:", finalLeadPayload);

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Ошибка: Пользователь не аутентифицирован. Пожалуйста, войдите в систему.');
        setIsSubmitting(false);
        // Опционально: перенаправить на страницу логина
        // history.push('/login'); 
        return;
    }

    try {
      const response = await api.post('/api/leads/create_manual/', finalLeadPayload, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      console.log('Lead created successfully:', response.data);
      alert('Лид успешно создан!');
      
      fetchLeads(); // Refresh the list of leads
      handleCloseModal();
    } catch (error) {
      console.error("Ошибка при создании лида вручную:", error);
      if (error.response && error.response.data) {
        let errorMessage = "Ошибка валидации при создании лида:\n";
        const errors = error.response.data;
        if (typeof errors === 'object' && errors !== null) {
            for (const key in errors) {
                // Если значение - массив, объединяем его элементы, иначе просто выводим значение
                const errorValue = Array.isArray(errors[key]) ? errors[key].join(', ') : errors[key];
                errorMessage += `${key}: ${errorValue}\n`;
            }
        } else {
            errorMessage += errors; // Если errors не объект (например, просто строка)
        }
        alert(errorMessage);
      } else if (error.request) {
        alert("Ошибка сети или сервер недоступен. Пожалуйста, проверьте ваше соединение.");
      } else {
        alert("Произошла неизвестная ошибка при создании лида. Подробности в консоли.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 min-h-screen bg-gray-100 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Лиды</h1>
        <button 
          onClick={handleOpenCreateLeadModal}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-opacity-50"
        >
          Создать лид
        </button>
      </div>

      {leads.length === 0 && !loading ? (
        <div className="text-center text-gray-500 mt-10">
            Лиды не найдены.
        </div>
      ) : (
        <div className="bg-white shadow-md rounded my-6">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-2 text-center">№</th>
                  <th className="py-3 px-1 text-center" style={{width: '40px'}}></th> {/* Empty header for delete icon */}
                  <th className="py-3 px-6 text-left">Название</th>
                  <th className="py-3 px-6 text-left">Контакт</th>
                  <th className="py-3 px-6 text-left">Компания</th>
                  <th className="py-3 px-6 text-left">Дата создания</th>
                  <th className="py-3 px-6 text-left">Департаменты</th>
                  <th className="py-3 px-6 text-left">Статус</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {leads.map((lead, idx) => (
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-1 px-2 text-center">{idx + 1}</td>
                  <td className="py-1 px-1 text-center align-middle" style={{width: '40px'}}>
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      title="Удалить лид"
                      disabled={isSubmitting}
                      className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                  <td className="py-1 px-3 text-left font-semibold">
                    <Link to={`/leads/${lead.id}`} className="text-blue-500">
                      <span style={{
                        display: 'inline-block',
                        maxWidth: '250px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        verticalAlign: 'middle'
                      }}>
                        {lead.name || 'Без названия'}
                      </span>
                    </Link>
                  </td>
                  <td className="py-1 px-3 text-left">
                    {lead.contact ? (
                      <Link to={`/contacts/${lead.contact.id}`} className="hover:underline">
                        {lead.contact.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-1 px-3 text-left">
                    {lead.contact && lead.contact.company ? (
                      <Link to={`/companies/${lead.contact.company.id}`} className="hover:underline">
                        {lead.contact.company.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-1 px-3 text-left">
                    {lead.created_at ? 
                      `${new Date(lead.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(lead.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
                      : '—'}
                  </td>
                  <td className="py-1 px-3 text-left">
                    {lead.departments && Array.isArray(lead.departments) && lead.departments.length > 0 ? 
                      lead.departments.map(dep => typeof dep === 'string' ? dep : (dep && dep.name) || '').filter(Boolean).join(', ') 
                      : '—'}
                  </td>
                  <td className="py-1 px-3 text-left">
                    {statusMap[lead.status] || lead.status || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for creating a new lead */} 
      {showCreateLeadModal && currentStep === 1 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Создать новый лид - Шаг 1: Данные</h2>
            <LeadDataForm 
              onSubmit={handleLeadDataSubmit}
              onCancel={handleCloseModal}
              initialData={{ 
                  fullName: "", 
                  phone: "+380", 
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

      {showCreateLeadModal && currentStep === 2 && stepOneData && (
         <EmployeeAssignmentModal
            isOpen={true} // Modal is controlled by showCreateLeadModal && currentStep === 2
            departments={stepOneData.selectedProducts || []} // Pass selected products/departments from step 1
            onClose={handleCloseModal} // Or go back to step 1: () => setCurrentStep(1)
            onSave={handleEmployeeAssignmentSave}
            isSaving={isSubmitting} // Pass submitting state to modal
            // Optional: provide a title for this specific context
            // title="Шаг 2: Назначьте ответственных"
        />
      )}
    </div>
  );
};

export default LeadListPage;
