import React, { useState } from 'react';
import { useCompany } from '../context/CompanyContext';
import ErrorDisplay from '../components/common/ErrorDisplay';

const CompanyListPage = () => {
  const { companies, loading, error, addCompany, editCompany, removeCompany } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    site: '',
    phone: '',
    email: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await editCompany(editingCompany.id, formData);
      } else {
        await addCompany(formData);
      }
      setIsModalOpen(false);
      setEditingCompany(null);
      setFormData({
        name: '',
        site: '',
        phone: '',
        email: ''
      });
    } catch (error) {
      console.error('Ошибка при сохранении компании:', error);
    }
  };

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      site: company.site,
      phone: company.phone,
      email: company.email
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту компанию?')) {
      try {
        await removeCompany(id);
      } catch (error) {
        console.error('Ошибка при удалении компании:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Компании</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Добавить компанию
        </button>
      </div>

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-2 text-center w-12">№</th>
              <th className="py-3 px-0 text-center" style={{width: '40px', minWidth: '40px', maxWidth: '40px'}}></th>
              <th className="py-3 px-6 text-left">Название</th>
              <th className="py-3 px-6 text-left">Контакт</th>
              <th className="py-3 px-6 text-left">Сайт</th>
              <th className="py-3 px-6 text-left">Телефон</th>
              <th className="py-3 px-6 text-left">Email</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {companies.map((company, idx) => (
              <tr key={company.id} className="border-b border-gray-200 hover:bg-gray-100 text-sm leading-tight h-8">
                <td className="py-1 px-2 text-center align-middle font-semibold">{idx + 1}</td>
                <td className="py-1 px-0 text-center align-middle" style={{width: '40px', minWidth: '40px', maxWidth: '40px', whiteSpace: 'nowrap'}}>
                  <div className="flex flex-row items-center justify-center gap-1 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(company)}
                      title="Редактировать"
                      className="p-1 hover:bg-blue-100 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.789l-4 1 1-4 14.362-14.302ZM19 7l-2-2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
                      title="Удалить"
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5M4 7.5h16M10 11v6M14 11v6M9 7.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="py-1 px-3 text-left">{company.name}</td>
                <td className="py-1 px-3 text-left">{company.main_contact ? company.main_contact.name : <span className="text-gray-400">—</span>}</td>
                <td className="py-1 px-3 text-left">
                  {company.site ? (
                    <a href={company.site.startsWith('http') ? company.site : `https://${company.site}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {company.site}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-1 px-3 text-left">{company.phone}</td>
                <td className="py-1 px-3 text-left">{company.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4">
              {editingCompany ? 'Редактировать компанию' : 'Добавить компанию'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Название
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Сайт
                </label>
                <input
                  type="url"
                  name="site"
                  value={formData.site}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="https://example.com"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {editingCompany ? 'Сохранить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCompany(null);
                    setFormData({
                      name: '',
                      site: '',
                      phone: '',
                      email: ''
                    });
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyListPage;
