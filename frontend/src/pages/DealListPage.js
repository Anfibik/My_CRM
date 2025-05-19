import React, { useEffect, useState, lazy, Suspense } from 'react';
import api from '../api/config';
import { useNavigate, Link } from 'react-router-dom';

// Отображение человекопонятных названий статусов сделок
const statusLabels = {
  need: 'Не обработана',
  identifying_need: 'Выявление потребности',
  solution: 'Подготовка решения',
  commercial_offer: 'Презентация КП',
  objections: 'Работа с возражениями',
  auction: 'Торг',
  contract: 'Подписание договора',
  prepay: 'Получение предоплаты',
  partners: 'Работа с подрядчиками',
  logistics: 'Логистика',
  implementation: 'Реализация',
  closing: 'Закрытие сделки',
};

// Lazy load DealInfoModal
const DealInfoModal = lazy(() => import('../components/deals/DealInfoModal'));

const DealListPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null); // выбранная сделка для модального окна
  const [showModal, setShowModal] = useState(false);        // флаг отображения модалки

  const navigate = useNavigate();

  // Функция загрузки сделок
  const fetchDeals = async () => {
    try {
      const response = await api.get('/api/deals/');
      const rawDeals = Array.isArray(response.data) ? response.data : response.data.results || [];
      const dealsWithDepthAndTasks = await Promise.all(
        rawDeals.map(async (deal) => {
          try {
            // Получаем события для подсчета глубины
            const eventsRes = await api.get(`/api/deal-events/?deal=${deal.id}`);
            const events = Array.isArray(eventsRes.data)
              ? eventsRes.data
              : eventsRes.data.results || [];
            const depthCount = events.filter(ev => ev.next_step_details).length;
            
            // Получаем задачи для данной сделки
            const tasksRes = await api.get(`/api/tasks/?deal=${deal.id}`);
            const tasks = Array.isArray(tasksRes.data)
              ? tasksRes.data
              : tasksRes.data.results || [];
            const tasksCount = tasks.length;
            
            return { ...deal, depth: depthCount, tasksCount: tasksCount };
          } catch (err) {
            console.error(`Ошибка при получении данных для сделки ${deal.id}:`, err);
            return { ...deal, depth: 0, tasksCount: 0 };
          }
        })
      );
      setDeals(dealsWithDepthAndTasks);
    } catch (error) {
      console.error("Ошибка при получении сделок:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Функция открытия модального окна по клику на карточку
  const handleCardClick = (deal) => {
    setSelectedDeal(deal);
    setShowModal(true);
  };

  // Функция закрытия модального окна
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDeal(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 min-h-screen bg-gray-100">
      <div className="flex justify-between items-center mb-4 pt-6">
        <h1 className="text-2xl font-bold">Сделки</h1>
        {/* Кнопка добавления сделки при необходимости */}
      </div>
      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-2 text-center w-12">№</th>
              <th className="py-3 px-6 text-left">Название</th>
              <th className="py-3 px-6 text-left">Дата создания</th>
              <th className="py-3 px-6 text-left">Департамент</th>
              <th className="py-3 px-6 text-left">Ответственный</th>
              <th className="py-3 px-6 text-left">Статус</th>
              <th className="py-3 px-6 text-center">Глубина</th>
              <th className="py-3 px-6 text-center">Задачи</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {deals.map((deal, idx) => (
              <tr key={deal.id} className="border-b border-gray-200 hover:bg-gray-100 text-sm leading-tight h-8">
                <td className="py-1 px-2 text-center">{idx + 1}</td>
                <td className="py-1 px-3 text-left">
                  <Link to={`/deals/${deal.id}`} className="text-blue-500 hover:underline">
                    {deal.name || 'Без названия'}
                  </Link>
                </td>
                <td className="py-1 px-3 text-left">{`${new Date(deal.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(deal.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}</td>
                <td className="py-1 px-3 text-left">{deal.department || '—'}</td>
                <td className="py-1 px-3 text-left">{deal.responsible ? deal.responsible.full_name : '—'}</td>
                <td className={`py-1 px-3 text-left ${deal.status === 'need' ? 'text-red-500 font-semibold' : ''}`}>{statusLabels[deal.status] || deal.status}</td>
                <td className="py-1 px-3 text-center">
                  {deal.depth ?? 0}
                </td>
                <td className="py-1 px-3 text-center">
                  <div className="flex justify-center items-center">
                    <span className={`${deal.tasksCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'} px-2 py-0.5 rounded-full text-xs font-medium`}>
                      {deal.tasksCount ?? 0}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Модальное окно */}
      {showModal && selectedDeal && (
        <Suspense fallback={<div>Загрузка информации о сделке...</div>}>
          <DealInfoModal deal={selectedDeal} onClose={handleCloseModal} />
        </Suspense>
      )}
    </div>
  );
};

export default DealListPage;
