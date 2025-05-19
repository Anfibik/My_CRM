import React, { useState } from 'react';
import { createCompany } from '../api/companies';

const CompanyForm = ({ onCompanyAdded }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newCompany = await createCompany({ name, description });
      onCompanyAdded(newCompany);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Ошибка при добавлении компании:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded-md mb-4">
      <h3 className="text-lg font-semibold mb-2">Добавить компанию</h3>
      <input
        type="text"
        placeholder="Название компании"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full p-2 border rounded mb-2"
      />
      <input
        type="text"
        placeholder="Описание компании"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full p-2 border rounded mb-2"
      />
      <button type="submit" className="bg-green-800 text-white px-4 py-2 rounded">
        Добавить
      </button>
    </form>
  );
};

export default CompanyForm;
