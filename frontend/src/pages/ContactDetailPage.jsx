import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/config';
import { PHONE_TYPE_LABELS } from '../constants';

// Вспомогательные словари (используем те же, что и в LeadDetailPage, если применимо)
const messengerMap = {
  telegram: "Telegram",
  viber: "Viber",
  whatsapp: "WhatsApp",
  signal: "Signal",
  // Добавьте другие, если есть
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

const DetailItem = ({ label, value, isLink, to }) => {
  if (value === null || value === undefined || value === '') {
    value = <span className="text-gray-500">Не указано</span>;
  }
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 px-4 sm:px-6">
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
    <div className="border-t border-gray-200">
      <dl className="divide-y divide-gray-200">
        {children}
      </dl>
    </div>
  </div>
);

const ContactDetailPage = () => {
  const { contactId } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/contacts/${contactId}/`);
        setContact(response.data);
      } catch (err) {
        console.error("Ошибка при получении данных контакта:", err);
        setError(err.response?.data?.detail || err.message || "Произошла ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    if (contactId) {
      fetchContact();
    }
  }, [contactId]);

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

  if (!contact) {
    return (
      <div className="container mx-auto px-4 py-6 text-center text-gray-500">
        Контакт не найден.
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const fullName = `${contact.last_name || ''} ${contact.first_name || ''} ${contact.middle_name || ''}`.trim() || 'Контакт без имени';

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-100 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{fullName}</h1>
        <p className="text-sm text-gray-500">ID: {contact.id}</p>
      </div>

      <SectionCard title="Основная информация">
        <DetailItem label="Имя" value={contact.first_name} />
        <DetailItem label="Фамилия" value={contact.last_name} />
        <DetailItem label="Отчество" value={contact.middle_name} />
        <DetailItem label="Должность" value={contact.position} />
        {/* Отображение нескольких телефонных номеров */}
        {contact.phone_numbers && contact.phone_numbers.length > 0 ? (
          contact.phone_numbers.map((pn, index) => (
            <DetailItem 
              key={`phone-${index}`} 
              label={`Телефон (${PHONE_TYPE_LABELS[pn.type] || pn.type})`} 
              value={pn.phone_number} 
            />
          ))
        ) : (
          <DetailItem label="Телефон" value={null} /> 
        )}
        <DetailItem label="Email" value={contact.email} />
        <DetailItem label="Мессенджер" value={messengerMap[contact.messenger] || contact.messenger} />
        <DetailItem label="Источник" value={sourceMap[contact.source] || contact.source} />
      </SectionCard>

      {contact.company && (
        <SectionCard title="Компания">
          <DetailItem 
            label="Название компании" 
            value={contact.company.name}
            isLink={true}
            to={`/companies/${contact.company.id}`}
           />
        </SectionCard>
      )}
      
      <SectionCard title="Дополнительная информация">
         <DetailItem 
          label="Ответственный менеджер"
          value={contact.responsible_manager ? contact.responsible_manager.full_name : ''}
          isLink={!!contact.responsible_manager}
          to={contact.responsible_manager ? `/users/${contact.responsible_manager.id}` : '#'}
        />
        <DetailItem label="Дата создания" value={formatDate(contact.created_at)} />
        <DetailItem label="Дата обновления" value={formatDate(contact.updated_at)} />
      </SectionCard>

      {/* Секция для связанных лидов (пример) */}
      {contact.leads && contact.leads.length > 0 && (
        <SectionCard title={`Лиды (${contact.leads.length})`}>
          {contact.leads.map(lead => (
            <DetailItem 
              key={lead.id} 
              label={lead.name} 
              value={`Статус: ${lead.status_display || lead.status}`}
              isLink={true}
              to={`/leads/${lead.id}`}
            />
          ))}
        </SectionCard>
      )}
      
      {/* Секция для связанных сделок (пример) */}
      {contact.deals && contact.deals.length > 0 && (
        <SectionCard title={`Сделки (${contact.deals.length})`}>
          {contact.deals.map(deal => (
            <DetailItem 
              key={deal.id} 
              label={deal.name} 
              value={`Сумма: ${deal.amount ? deal.amount.toLocaleString('ru-RU') : 'N/A'} ${deal.currency || ''}`}
              isLink={true}
              to={`/deals/${deal.id}`}
            />
          ))}
        </SectionCard>
      )}

      <div className="mt-8 flex justify-end space-x-3">
        <Link 
            to={`/contacts`}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            К списку контактов
        </Link>
        {/* <Link 
            to={`/contacts/edit/${contact.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            Редактировать
        </Link> */}
      </div>

    </div>
  );
};

export default ContactDetailPage;