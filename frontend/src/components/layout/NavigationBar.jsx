import React from 'react';
import { Link } from 'react-router-dom';

const NavigationBar = ({ user, logout }) => {
  return (
    <nav className="h-[40px] bg-gray-800 p-2 flex justify-between items-center">
      <ul className="flex space-x-4">
        <li>
          <Link to="/inquiries" className="text-white hover:text-gray-300">
            Обращения
          </Link>
        </li>
        <li>
          <Link to="/contacts" className="text-white hover:text-gray-300">
            Контакты
          </Link>
        </li>
        <li>
          <Link to="/companies" className="text-white hover:text-gray-300">
            Компании
          </Link>
        </li>
        <li>
          <Link to="/leads" className="text-white hover:text-gray-300">
            Лиды
          </Link>
        </li>
        <li>
          <Link to="/deals" className="text-white hover:text-gray-300">
            Сделки
          </Link>
        </li>
        <li>
          <Link to="/my-tasks-kanban" className="text-white hover:text-gray-300">
            Задачи
          </Link>
        </li>
      </ul>
      {user && (
        <div className="flex items-center">
          <span className="text-white mr-3">{user.full_name}</span>
          <button
            onClick={logout}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Выйти
          </button>
        </div>
      )}
    </nav>
  );
};

export default NavigationBar;