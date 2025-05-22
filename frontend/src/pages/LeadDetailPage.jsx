import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/config';

// Вспомогательные словари для отображения человекочитаемых значений
const statusMap = {
  new: "Новый",
  in_progress: "В работе",
  open: "Открыт",
  won: "Выигран",
  lost: "Проигран",
  non_active: "Не активен",
  converted: "Конвертирован"
};

const sourceMap = {
  website: "Веб-сайт",
  call: "Звонок",
  recommendation: "Рекомендация",
  partner: "Партнер",
  cold_call: "Холодный звонок",
  conference: "Конференция",
  exhibition: "Выставка",
  social_media: "Социальные сети",
  other: "Другое",
};

const messengerMap = {
  telegram: "Telegram",
  viber: "Viber",
  whatsapp: "WhatsApp",
  signal: "Signal",
  // Добавьте другие, если есть
};

const departmentMap = {
    "warehouses": "ШМБ",
    "racks": "Стеллажные системы",
    "warehouses_machines": "Складская техника",
    "plastic_containers": "Пластиковая тара",
    "trash_bins": "Мусорные баки",
    "sorting_systems": "Системы сортировки",
    "automation": "Автоматизация",
    "services": "Сервисные услуги",
    "administrations": "Администрация",
    "logistics": "Логистика",
    "finance": "Финансы и бухгалтерия",
    "marketing": "Маркетинг",
};

const roleMap = {
    'owner': 'Собственник',
    'sales_manager': 'Менеджер по продажам',
    'project_manager': 'Проектный менеджер',
    'account_manager': 'Аккаунт менеджер',
    'logistic': 'Логист',
    'engineer': 'Инженер',
    'warehouse_worker': 'Кладовщик',
    'accountant': 'Бухгалтер',
    'lawyer': 'Юрист',
    'top_manager': 'ТОП Менеджер',
    'call_operator': 'Оператор кол-центра'
};


const DetailItem = ({ label, value, isLink, to }) => {
  if (value === null || value === undefined || value === '') {
    value = <span className="text-gray-500">Не указано</span>;
  }
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
        {isLink && value !== 'Не указано' && typeof value !== 'object' ? (
          <Link to={to} className="text-blue-600 hover:underline">{value}</Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
};

const SectionCard = ({ title, children }) => (
  <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
    {title && (
      <div className="px-4 py-5 sm:px-6 bg-gray-50">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
      </div>
    )}
    <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
      <dl className="sm:divide-y sm:divide-gray-200">
        {children}
      </dl>
    </div>
  </div>
);

const LeadDetailPage = () => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/leads/${leadId}/`);
        setLead(response.data);
      } catch (err) {
        console.error("Ошибка при получении данных лида:", err);
        setError(err.response?.data?.detail || err.message || "Произошла ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Ошибка! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="container mx-auto px-4 py-6 text-center text-gray-500">
        Лид не найден.
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{lead.name || 'Лид без названия'}</h1>
        <p className="text-sm text-gray-500">ID: {lead.id}</p>
      </div>

      <SectionCard title="Основная информация о лиде">
        <DetailItem label="Статус" value={statusMap[lead.status] || lead.status} />
        <DetailItem label="Потребность/Интерес" value={lead.need} />
        <DetailItem label="Источник" value={sourceMap[lead.source] || lead.source} />
        <DetailItem label="Дата создания" value={formatDate(lead.created_at)} />
        <DetailItem label="Дата обновления" value={formatDate(lead.updated_at)} />
        <DetailItem 
          label="Ответственный менеджер"
          value={lead.responsible_manager ? lead.responsible_manager.full_name : ''}
          isLink={!!lead.responsible_manager}
          to={lead.responsible_manager ? `/users/${lead.responsible_manager.id}` : '#'}
        />
      </SectionCard>

      {lead.contact && (
        <SectionCard title="Контактная информация">
          <DetailItem 
            label="ФИО Контакта" 
            value={lead.contact.name}
            isLink={true}
            to={`/contacts/${lead.contact.id}`}
          />
          <DetailItem label="Телефон" value={lead.contact.phone} />
          <DetailItem label="Email" value={lead.contact.email} />
          <DetailItem label="Мессенджер" value={messengerMap[lead.contact.messenger] || lead.contact.messenger} />
        </SectionCard>
      )}

      {lead.contact && lead.contact.company && (
        <SectionCard title="Информация о компании">
          <DetailItem 
            label="Название компании" 
            value={lead.contact.company.name}
            isLink={true}
            to={`/companies/${lead.contact.company.id}`}
           />
          <DetailItem label="Сайт" value={lead.contact.company.site ? <a href={lead.contact.company.site} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.contact.company.site}</a> : ''} />
          <DetailItem label="Телефон компании" value={lead.contact.company.phone} />
          <DetailItem label="Email компании" value={lead.contact.company.email} />
        </SectionCard>
      )}

      {lead.inquiry && (
        <SectionCard title="Детали исходной заявки (Inquiry)">
          <DetailItem label="ФИО из заявки" value={lead.inquiry.full_name} />
          <DetailItem label="Телефон из заявки" value={lead.inquiry.phone} />
          <DetailItem label="Email из заявки" value={lead.inquiry.email} />
          <DetailItem label="Компания из заявки" value={lead.inquiry.company_name} />
          <DetailItem label="Город" value={lead.inquiry.city} />
          <DetailItem label="Источник заявки" value={sourceMap[lead.inquiry.source] || lead.inquiry.source} />
          <DetailItem label="UTM Source" value={lead.inquiry.utm_source} />
          <DetailItem label="UTM Medium" value={lead.inquiry.utm_medium} />
          <DetailItem label="UTM Campaign" value={lead.inquiry.utm_campaign} />
          <DetailItem label="UTM Term" value={lead.inquiry.utm_term} />
          <DetailItem label="UTM Content" value={lead.inquiry.utm_content} />
          <DetailItem label="Referrer" value={lead.inquiry.referrer} />
          <DetailItem label="Комментарий/Сообщение" value={<pre className="whitespace-pre-wrap text-sm">{lead.inquiry.comment}</pre>} />
          <DetailItem 
            label="Ответственный оператор заявки"
            value={lead.inquiry.call_operator ? lead.inquiry.call_operator.full_name : ''}
            isLink={!!lead.inquiry.call_operator}
            to={lead.inquiry.call_operator ? `/users/${lead.inquiry.call_operator.id}` : '#'}
          />
           <DetailItem label="Дата создания заявки" value={formatDate(lead.inquiry.created_at)} />
        </SectionCard>
      )}

      {lead.departments && lead.departments.length > 0 && (
        <SectionCard title="Департаменты">
          <DetailItem label="" value={lead.departments.map(dep => departmentMap[dep] || dep).join(', ')} />
        </SectionCard>
      )}

      {lead.participants && lead.participants.length > 0 && (
         <SectionCard title="Участники лида">
            {lead.participants.map(user => (
              <DetailItem 
                key={user.id} 
                label={roleMap[user.role] || 'Участник'} 
                value={user.full_name}
                isLink={true}
                to={`/users/${user.id}`}
              />
            ))}
        </SectionCard>
      )}

      {/* Секция для возможного редактирования или других действий */}
      <div className="mt-8 flex justify-end space-x-3">
        <Link 
            to={`/leads`}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            К списку лидов
        </Link>
        {/* <button 
            type="button"
            // onClick={() => navigateToEdit(lead.id)} // Пример
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            Редактировать лид
        </button> */}
      </div>

    </div>
  );
};

export default LeadDetailPage;