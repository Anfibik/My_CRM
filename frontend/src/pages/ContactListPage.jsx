import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContacts } from '../context/ContactContext';
import { PHONE_TYPE_OPTIONS, PHONE_TYPE_LABELS } from '../constants';

const ContactListPage = () => {
  const { contacts, loading, error, getContacts, createContact, updateContact, deleteContact, clearError } = useContacts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_numbers: [{ phone_number: '', type: 'WORK_PRIMARY' }],
    email: '',
    messenger: '',
    company: ''
  });

  useEffect(() => {
    getContacts();
  }, [getContacts]);

  const handleAddPhoneNumber = () => {
    setFormData((prev) => ({
        ...prev,
        phone_numbers: [...prev.phone_numbers, { phone_number: '', type: 'WORK_PRIMARY' }]
    }));
  };

  const handleRemovePhoneNumber = (index) => {
    setFormData((prev) => ({
        ...prev,
        phone_numbers: prev.phone_numbers.filter((_, i) => i !== index)
    }));
  };

  const handlePhoneNumberChange = (index, field, value) => {
    setFormData((prev) => ({
        ...prev,
        phone_numbers: prev.phone_numbers.map((pn, i) => 
            i === index ? { ...pn, [field]: value } : pn
        )
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const activePhoneNumbers = formData.phone_numbers.filter(
        pn => pn.phone_number && pn.phone_number.replace(/\D/g, '').length > 0
    );

    if (activePhoneNumbers.length === 0 && !formData.email) {
        alert("Пожалуйста, укажите хотя бы один номер телефона или email.");
        return;
    }

    const dataToSend = {
        ...formData,
        phone_numbers: activePhoneNumbers,
    };
    delete dataToSend.phone; 

    try {
        if (editingContact) {
            await updateContact(editingContact.id, dataToSend);
        } else {
            await createContact(dataToSend);
        }
        setIsModalOpen(false);
        setEditingContact(null);
        setFormData({ 
            name: '', 
            phone_numbers: [{ phone_number: '', type: 'WORK_PRIMARY' }], 
            email: '', 
            messenger: '', 
            company: '' 
        });
    } catch (err) {
        console.error("Ошибка при сохранении контакта:", err);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
        name: contact.name || '',
        phone_numbers: contact.phone_numbers && contact.phone_numbers.length > 0 
                       ? contact.phone_numbers 
                       : [{ phone_number: '', type: 'WORK_PRIMARY' }],
        email: contact.email || '',
        messenger: contact.messenger || '',
        company: contact.company ? (typeof contact.company === 'object' ? contact.company.name : contact.company) : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот контакт?')) {
      try {
        await deleteContact(id);
      } catch (err) {
        // Error is handled by context
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
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-xl mx-auto mt-8">
        {error}
        <button onClick={clearError} className="absolute top-2 right-2 text-red-500">✕</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Контакты</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Добавить контакт
        </button>
      </div>

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-2 text-center w-12">№</th>
              <th className="py-3 px-0 text-center" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}></th>
              <th className="py-3 px-6 text-left">Имя</th>
              <th className="py-3 px-6 text-left">Телефон (осн.)</th>
              <th className="py-3 px-6 text-left">Email</th>
              <th className="py-3 px-6 text-left">Компания</th>
              <th className="py-3 px-6 text-left">Messenger</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {(contacts || []).map((contact, idx) => (
              <tr key={contact.id} className="border-b border-gray-200 hover:bg-gray-100 text-sm leading-tight h-8">
                <td className="py-1 px-2 text-center align-middle font-semibold">{idx + 1}</td>
                <td className="py-1 px-0 text-center align-middle" style={{ width: '40px', minWidth: '40px', maxWidth: '40px', whiteSpace: 'nowrap' }}>
                  <div className="flex flex-row items-center justify-center gap-1 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(contact)}
                      title="Редактировать"
                      className="p-1 hover:bg-blue-100 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.789l-4 1 1-4 14.362-14.302ZM19 7l-2-2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.5M4 7.5h16M10 11v6M14 11v6M9 7.5V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5" />
                      </svg>
                    </button>
                  </div>
                </td>

                <td className="py-1 px-3 text-left font-semibold">
                  <Link to={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                    {contact.name}
                  </Link>
                </td>

                <td className="py-1 px-6 text-left align-middle">
                  {contact.phone_numbers && contact.phone_numbers.length > 0
                    ? `${contact.phone_numbers[0].phone_number} (${PHONE_TYPE_LABELS[contact.phone_numbers[0].type] || contact.phone_numbers[0].type})`
                    : 'Не указан'}
                </td>
                <td className="py-1 px-3 text-left">{contact.email}</td>

                <td className="py-1 px-3 text-left">
                  {contact.company ? (
                    <Link to={`/companies/${contact.company.id}`} className="hover:underline">
                      {contact.company.name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className="py-1 px-3 text-left">
                  {contact.messenger
                    ? ({
                      telegram: 'Телеграмм',
                      viber: 'Вайбер',
                      whatsapp: 'WhatsApp',
                      signal: 'Сигнал'
                    }[contact.messenger] || contact.messenger)
                    : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4">
              {editingContact ? 'Редактировать контакт' : 'Добавить контакт'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Имя
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              {/* Блок для телефонных номеров */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Телефоны</label>
                {formData.phone_numbers.map((pn, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="tel"
                      placeholder="Номер телефона"
                      value={pn.phone_number}
                      onChange={(e) => handlePhoneNumberChange(index, 'phone_number', e.target.value)}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                    <select
                      value={pn.type}
                      onChange={(e) => handlePhoneNumberChange(index, 'type', e.target.value)}
                      className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                      {PHONE_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {formData.phone_numbers.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemovePhoneNumber(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        &#x2715;
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={handleAddPhoneNumber}
                  className="text-blue-500 hover:text-blue-700 text-sm mt-1"
                >
                  + Добавить телефон
                </button>
              </div>
              <div className="mb-4">
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
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Компания
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Мессенджер
                </label>
                <input
                  type="text"
                  name="messenger"
                  value={formData.messenger}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {editingContact ? 'Сохранить' : 'Добавить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingContact(null);
                    setFormData({ name: '', phone_numbers: [{ phone_number: '', type: 'WORK_PRIMARY' }], email: '', messenger: '', company: '' });
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

export default ContactListPage;
