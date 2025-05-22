import React, { useState, useEffect } from 'react';
import api from '../api/config';
import { Link } from 'react-router-dom'; // Добавлен импорт Link

const LeadListPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {/* Можно добавить кнопку "Добавить лид" здесь, если необходимо */}
        {/* <Link to="/leads/new" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Добавить лид
        </Link> */}
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
                <th className="py-3 px-2 text-center w-12">№</th>
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
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-100 text-sm leading-tight h-10">
                  <td className="py-1 px-2 text-center">{idx + 1}</td>
                  <td className="py-1 px-3 text-left">
                    <Link to={`/leads/${lead.id}`} className="text-blue-500 hover:underline">
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
                      <Link to={`/contacts/${lead.contact.id}`} className="text-blue-500 hover:underline">
                        {lead.contact.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-1 px-3 text-left">
                    {lead.contact && lead.contact.company ? (
                      <Link to={`/companies/${lead.contact.company.id}`} className="text-blue-500 hover:underline">
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
    </div>
  );
};

export default LeadListPage;
