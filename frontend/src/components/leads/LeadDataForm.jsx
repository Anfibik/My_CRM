import React, { useState, useEffect } from 'react';
import { MESSENGER_LABELS, PHONE_TYPE_OPTIONS, PHONE_TYPE_LABELS } from '../../constants';

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
    const [phoneNumbers, setPhoneNumbers] = useState(
        initialData.phone_numbers && initialData.phone_numbers.length > 0
            ? initialData.phone_numbers
            : [{ phone_number: "+380", phone_type: "WORK_PRIMARY" }]
    );
    const [email, setEmail] = useState(initialData.email || "");
    const [messenger, setMessenger] = useState(initialData.messenger || "");
    const [companyName, setCompanyName] = useState(initialData.companyName || "");
    const [companySite, setCompanySite] = useState(initialData.companySite || "https://");
    const [needDescription, setNeedDescription] = useState(initialData.needDescription || "");
    const [selectedProducts, setSelectedProducts] = useState(initialData.selectedProducts || []);

    useEffect(() => {
        // If initialData changes, update the form fields
        setFullName(initialData.fullName || "");
        // setPhone(initialData.phone || "+380"); // Заменено на phoneNumbers
        setPhoneNumbers(
            initialData.phone_numbers && initialData.phone_numbers.length > 0
                ? initialData.phone_numbers
                : [{ phone_number: "+380", phone_type: "WORK_PRIMARY" }]
        );
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

    const handleAddPhoneNumber = () => {
        setPhoneNumbers([...phoneNumbers, { phone_number: "+380", phone_type: "WORK_PRIMARY" }]);
    };

    const handleRemovePhoneNumber = (index) => {
        const newPhoneNumbers = phoneNumbers.filter((_, i) => i !== index);
        setPhoneNumbers(newPhoneNumbers);
    };

    const handlePhoneNumberChange = (index, field, value) => {
        const newPhoneNumbers = phoneNumbers.map((pn, i) => {
            if (i === index) {
                return { ...pn, [field]: value };
            }
            return pn;
        });
        setPhoneNumbers(newPhoneNumbers);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Фильтруем пустые номера перед отправкой, если нужно (например, если пользователь добавил поле, но не заполнил)
        const activePhoneNumbers = phoneNumbers.filter(pn => pn.phone_number && pn.phone_number.replace(/\D/g, '').length > 0);

        if (activePhoneNumbers.length === 0 && !email) {
            alert("Пожалуйста, укажите хотя бы один номер телефона или email.");
            return;
        }

        const formData = {
            fullName,
            phone_numbers: activePhoneNumbers,
            email,
            messenger,
            companyName,
            companySite,
            needDescription,
            selectedProducts, 
        };
        console.log('LeadDataForm handleSubmit, formData to submit:', formData);
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефоны:</label>
                {phoneNumbers.map((pn, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                            type="tel"
                            placeholder="Номер телефона"
                            className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={pn.phone_number}
                            onChange={(e) => handlePhoneNumberChange(index, 'phone_number', e.target.value)}
                        />
                        <select
                            className="mt-1 block w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={pn.phone_type}
                            onChange={(e) => handlePhoneNumberChange(index, 'phone_type', e.target.value)}
                        >
                            {PHONE_TYPE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        {phoneNumbers.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleRemovePhoneNumber(index)}
                                className="p-2 text-red-500 hover:text-red-700"
                                title="Удалить телефон"
                            >
                                &#x2715; 
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={handleAddPhoneNumber}
                    className="mt-2 px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50"
                >
                    Добавить телефон
                </button>
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
