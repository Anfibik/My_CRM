import React, { useState, useEffect } from 'react';
import { MESSENGER_LABELS } from '../../constants';

// TODO: Consider moving AVAILABLE_PRODUCTS to a shared constants.js file
const AVAILABLE_PRODUCTS = [
    "Стеллажные системы",
    "Складская техника",
    "ШМБ", // Штабелеры Малой Грузоподъемности?
    "Пластиковая тара",
    "Автоматизация",
    "Мусорные баки",
    "Системы сортировки",
    "Сервисные услуги",
];

const LeadDataForm = ({ onSubmit, onCancel, initialData = {} }) => {
    const [fullName, setFullName] = useState(initialData.fullName || "");
    const [phone, setPhone] = useState(initialData.phone || "+380");
    const [email, setEmail] = useState(initialData.email || "");
    const [messenger, setMessenger] = useState(initialData.messenger || "");
    const [companyName, setCompanyName] = useState(initialData.companyName || "");
    const [companySite, setCompanySite] = useState(initialData.companySite || "https://");
    const [needDescription, setNeedDescription] = useState(initialData.needDescription || "");
    const [selectedProducts, setSelectedProducts] = useState(initialData.selectedProducts || []);

    useEffect(() => {
        // If initialData changes, update the form fields
        setFullName(initialData.fullName || "");
        setPhone(initialData.phone || "+380");
        setEmail(initialData.email || "");
        setMessenger(initialData.messenger || "");
        setCompanyName(initialData.companyName || "");
        setCompanySite(initialData.companySite || "https://");
        setNeedDescription(initialData.needDescription || "");
        setSelectedProducts(initialData.selectedProducts || []);
    }, [initialData]);

    const handleCheckboxChange = (product) => {
        setSelectedProducts(prev =>
            prev.includes(product)
                ? prev.filter(p => p !== product)
                : [...prev, product]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = {
            fullName,
            phone,
            email,
            messenger,
            companyName,
            companySite,
            needDescription,
            selectedProducts, // These are the selected 'departments' or 'products'
        };
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">ФИО клиента:</label>
                <input
                    type="text"
                    id="fullName"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Телефон:</label>
                <input
                    type="tel"
                    id="phone"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email:</label>
                <input
                    type="email"
                    id="email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="messenger" className="block text-sm font-medium text-gray-700">Мессенджер:</label>
                <select
                    id="messenger"
                    name="messenger"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={messenger}
                    onChange={(e) => setMessenger(e.target.value)}
                >
                    <option value="">Выберите мессенджер</option>
                    {Object.entries(MESSENGER_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Название компании:</label>
                <input
                    type="text"
                    id="companyName"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="companySite" className="block text-sm font-medium text-gray-700">Сайт компании:</label>
                <input
                    type="url"
                    id="companySite"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={companySite}
                    onChange={(e) => setCompanySite(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="needDescription" className="block text-sm font-medium text-gray-700">Описание потребности:</label>
                <textarea
                    id="needDescription"
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={needDescription}
                    onChange={(e) => setNeedDescription(e.target.value)}
                    required
                ></textarea>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Выбранные направления/продукты:</label>
                <div className="mt-2 space-y-2">
                    {AVAILABLE_PRODUCTS.map((product) => (
                        <div key={product} className="flex items-center">
                            <input
                                id={`product-${product}`}
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                checked={selectedProducts.includes(product)}
                                onChange={() => handleCheckboxChange(product)}
                            />
                            <label htmlFor={`product-${product}`} className="ml-2 block text-sm text-gray-900">
                                {product}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Отмена
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Далее
                </button>
            </div>
        </form>
    );
};

export default LeadDataForm;
