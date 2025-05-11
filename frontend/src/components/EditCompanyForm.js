import React, { useState } from 'react';
import { updateCompany } from '../api/companies';

const EditCompanyForm = ({ company, onUpdate, onCancel }) => {
    const [name, setName] = useState(company.name);
    const [description, setDescription] = useState(company.description);
    const [site, setSite] = useState(company.site);
    const [phone, setPhone] = useState(company.phone);
    const [email, setEmail] = useState(company.email);
    const [industry, setIndustry] = useState(company.industry);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const updatedCompany = await updateCompany(company.id, { name, description, site, phone, email, industry });
            onUpdate(updatedCompany);  // Передаём обновлённые данные в родительский компонент
        } catch (error) {
            console.error('Ошибка при обновлении компании:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '10px' }}>

            <h3>Редактировать компанию</h3>

            <input
                type="text"
                placeholder="Название компании"
                className="w-full p-2 border rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <br />

            <div className="mb-2">
                <label className="block font-semibold">Описание компании:</label>
                <textarea
                    className="w-full p-2 border rounded"
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div className="mb-2">
                <label className="block font-semibold">Сайт:</label>
                <input
                    type="url"
                    className="w-full p-2 border rounded"
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                />
            </div>

            <div className="mb-2">
                <label className="block font-semibold">Телефон:</label>
                <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>

            <div className="mb-2">
                <label className="block font-semibold">Email:</label>
                <input
                    type="email"
                    className="w-full p-2 border rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className="mb-2">
                <label className="block font-semibold">Индустрия:</label>
                <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                />
            </div>


            <br />
            <button type="submit">Сохранить</button>
            <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Отмена</button>
        </form>
    );
};

export default EditCompanyForm;
