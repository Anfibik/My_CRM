import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/config';

// Вспомогательные словари (добавьте свои значения при необходимости)
const companyTypeMap = {
  client: "Клиент",
  partner: "Партнер",
  competitor: "Конкурент",
  supplier: "Поставщик",
  other: "Другое"
};

const industryMap = {
  it: "IT и Технологии",
  manufacturing: "Производство",
  retail: "Розничная торговля",
  services: "Услуги",
  finance: "Финансы",
  // ... добавьте другие отрасли
};

const DetailItem = ({ label, value, isLink, to, isExternalLink }) => {
  if (value === null || value === undefined || value === '') {
    value = <span className="text-gray-500">Не указано</span>;
  }
  return (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 px-4 sm:px-6">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
        {isLink && value !== 'Не указано' && typeof value !== 'object' ? (
          <Link to={to} className="text-blue-600 hover:underline">{value}</Link>
        ) : isExternalLink && value !== 'Не указано' && typeof value === 'string' && value.startsWith('http') ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value}</a>
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

const CompanyDetailPage = () => {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/companies/${companyId}/`);
        setCompany(response.data);
      } catch (err) {
        console.error("Ошибка при получении данных компании:", err);
        setError(err.response?.data?.detail || err.message || "Произошла ошибка при загрузке данных");
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

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

  if (!company) {
    return (
      <div className="container mx-auto px-4 py-6 text-center text-gray-500">
        Компания не найдена.
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
        <h1 className="text-3xl font-bold text-gray-800">{company.name || 'Компания без названия'}</h1>
        <p className="text-sm text-gray-500">ID: {company.id}</p>
      </div>

      <SectionCard title="Основная информация">
        <DetailItem label="Тип компании" value={companyTypeMap[company.company_type] || company.company_type} />
        <DetailItem label="Отрасль" value={industryMap[company.industry] || company.industry} />
        <DetailItem label="Сайт" value={company.site} isExternalLink={true} />
        <DetailItem label="Телефон" value={company.phone} />
        <DetailItem label="Email" value={company.email} />
        <DetailItem label="Годовой доход" value={company.annual_revenue ? `${company.annual_revenue.toLocaleString('ru-RU')} RUB` : ''} />
        <DetailItem label="Количество сотрудников" value={company.employees_count} />
        <DetailItem label="Описание" value={<pre className="whitespace-pre-wrap text-sm">{company.description}</pre>} />
      </SectionCard>

      <SectionCard title="Адрес">
        <DetailItem label="Улица, дом" value={company.address_street} />
        <DetailItem label="Город" value={company.address_city} />
        <DetailItem label="Область/Регион" value={company.address_state} />
        <DetailItem label="Почтовый индекс" value={company.address_postal_code} />
        <DetailItem label="Страна" value={company.address_country} />
      </SectionCard>

      <SectionCard title="Дополнительная информация">
        <DetailItem 
          label="Ответственный менеджер"
          value={company.responsible_manager ? company.responsible_manager.full_name : ''}
          isLink={!!company.responsible_manager}
          to={company.responsible_manager ? `/users/${company.responsible_manager.id}` : '#'}
        />
        <DetailItem label="Дата создания" value={formatDate(company.created_at)} />
        <DetailItem label="Дата обновления" value={formatDate(company.updated_at)} />
      </SectionCard>

      {/* Секция для связанных контактов (пример) */}
      {company.contacts && company.contacts.length > 0 && (
        <SectionCard title={`Контакты (${company.contacts.length})`}>
          {company.contacts.map(contact => (
            <DetailItem 
              key={contact.id} 
              label={contact.name} 
              value={contact.position || 'Контакт'}
              isLink={true}
              to={`/contacts/${contact.id}`}
            />
          ))}
        </SectionCard>
      )}

      {/* Секция для связанных лидов (пример) */}
      {company.leads && company.leads.length > 0 && (
        <SectionCard title={`Лиды (${company.leads.length})`}>
          {company.leads.map(lead => (
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
      {company.deals && company.deals.length > 0 && (
        <SectionCard title={`Сделки (${company.deals.length})`}>
          {company.deals.map(deal => (
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
            to={`/companies`}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            К списку компаний
        </Link>
        {/* <Link 
            to={`/companies/edit/${company.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
        >
            Редактировать
        </Link> */}
      </div>

    </div>
  );
};

export default CompanyDetailPage;