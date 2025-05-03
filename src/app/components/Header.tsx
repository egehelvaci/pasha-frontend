import React from 'react';

type HeaderProps = {
  title: string;
  user: {
    name: string;
    imageUrl: string;
  };
};

const Header = ({ title, user }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center">
        <button
          type="button"
          className="p-1 text-gray-500 rounded-full hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="sr-only">View notifications</span>
          <svg
            className="w-6 h-6"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
        <div className="ml-3 relative group">
          <div className="flex items-center">
            <img
              className="h-8 w-8 rounded-full"
              src={user.imageUrl || "https://via.placeholder.com/40"}
              alt={user.name}
            />
            <span className="ml-2 text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block">
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Profiliniz
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Ayarlar
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Çıkış Yap
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 