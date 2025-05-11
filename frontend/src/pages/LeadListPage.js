import React, { useState, useEffect } from 'react';
import api from '../api/config';

const LeadListPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Словарь для отображения человекочитаемого статуса
  const statusMap = {
    new: "Новый",
    in_progress: "В работе",
    non_active: "Не активен"
  };

  // Функция для загрузки лидов
  const fetchLeads = async () => {
    try {
      const response = await api.get('/api/leads/');
      setLeads(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error("Ошибка при получении лидов:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  if (loading) {
    return <p>Загрузка лидов...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Лиды</h2>
      <ul className="space-y-4">
        {leads.map((lead) => (
          <li key={lead.id} className="bg-white p-4 shadow rounded-md">
            <p><strong>Название лида: </strong> {lead.name}</p>
            <p><strong>Контакт:</strong> {lead.contact ? lead.contact.name : "—"}</p>
            <p><strong>Компания:</strong> {lead.contact && lead.contact.company ? lead.contact.company.name : "—"}</p>
            <p><strong>Потребность:</strong> {lead.need}</p>
            <p><strong>Статус:</strong> {statusMap[lead.status] ?? lead.status}</p>
            <p><strong>Оператор:</strong> {lead.converted_by ? lead.converted_by.full_name : '—'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeadListPage;
