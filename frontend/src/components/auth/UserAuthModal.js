import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorDisplay from '../common/ErrorDisplay';

// Справочники ролей и департаментов (должны совпадать с backend)
const ROLE_CHOICES = [
  { value: 'owner', label: 'Собственник' },
  { value: 'sales_manager', label: 'Менеджер по продажам' },
  { value: 'project_manager', label: 'Проектный менеджер' },
  { value: 'account_manager', label: 'Аккаунт менеджер' },
  { value: 'logistic', label: 'Логист' },
  { value: 'engineer', label: 'Инженер' },
  { value: 'warehouse_worker', label: 'Кладовщик' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'lawyer', label: 'Юрист' },
  { value: 'top_manager', label: 'ТОП Менеджер' },
  { value: 'call_operator', label: 'Оператор кол-центра' },
];
const DEPARTMENT_CHOICES = [
  { value: 'warehouses', label: 'ШМБ' },
  { value: 'racks', label: 'Стеллажные системы' },
  { value: 'warehouses_machines', label: 'Складская техника' },
  { value: 'plastic_containers', label: 'Пластиковая тара' },
  { value: 'trash_bins', label: 'Мусорные баки' },
  { value: 'sorting_systems', label: 'Системы сортировки' },
  { value: 'automation', label: 'Автоматизация' },
  { value: 'services', label: 'Сервисные услуги' },
  { value: 'administrations', label: 'Администрация' },
  { value: 'logistics', label: 'Логистика' },
  { value: 'finance', label: 'Финансы и бухгалтерия' },
  { value: 'marketing', label: 'Маркетинг' },
];

const UserAuthModal = () => {
  const { login, signup, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    work_phone: '',
    work_email: '',
    role: '',
    department: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPasswordError('');

    try {
      if (isLogin) {
        await login({
          email: formData.work_email,
          password: formData.password,
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          setPasswordError('Пароли должны совпадать');
          return;
        }
        console.log('Регистрация (sign up):', formData);
        const payload = {
          full_name: formData.full_name,
          work_phone: formData.work_phone,
          work_email: formData.work_email,
          role: formData.role,
          department: formData.department,
          password: formData.password,
          password2: formData.confirmPassword,
        };
        console.log('Payload на сервер:', payload);
        await signup({ ...payload });
      }
    } catch (error) {
      setError(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-2xl font-bold mb-4">
          {isLogin ? 'Вход' : 'Регистрация'}
        </h2>

        {error && <ErrorDisplay error={error} />}
        {authError && <ErrorDisplay error={authError} />}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Полное имя
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Рабочий телефон
                </label>
                <input
                  type="text"
                  name="work_phone"
                  value={formData.work_phone}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Рабочая почта
                </label>
                <input
                  type="email"
                  name="work_email"
                  value={formData.work_email}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Роль
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Выберите роль</option>
                  {ROLE_CHOICES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Департамент
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Выберите департамент</option>
                  {DEPARTMENT_CHOICES.map((dep) => (
                    <option key={dep.value} value={dep.value}>
                      {dep.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {isLogin ? (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Рабочая почта
              </label>
              <input
                type="email"
                name="work_email"
                value={formData.work_email}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
          ) : null}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Пароль
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          {!isLogin && (
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Подтверждение пароля
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
              {passwordError && (
                <div className="text-red-500 text-xs mt-1">{passwordError}</div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 hover:text-blue-800"
            >
              {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт?'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserAuthModal;
