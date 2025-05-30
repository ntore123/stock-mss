import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';

const TopNav = ({ user, setUser }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await authAPI.logout();
            setUser(null);
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout even if API call fails
            setUser(null);
            navigate('/login');
        }
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const navItems = [
        { path: '/', label: 'Dashboard' },
        { path: '/spare-parts', label: 'Spare Parts' },
        { path: '/stock-in', label: 'Stock In' },
        { path: '/stock-out', label: 'Stock Out' },
        { path: '/reports', label: 'Reports' },
    ];

    return (
        <nav className="bg-sky-700 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <div>
                                <h1 className="text-xl font-bold">SIMS</h1>
                                <p className="text-xs text-sky-200">SmartPark Inventory</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="md:flex items-center space-x-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                    isActive(item.path)
                                        ? 'bg-sky-600 text-white'
                                        : 'text-sky-100 hover:bg-sky-600 hover:text-white'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center space-x-4">
                        <div className="text-sm">
                            <span className="text-sky-200">Welcome, </span>
                            <span className="font-medium">{user?.username || 'User'}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-sky-600 hover:bg-sky-500 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                                    isActive(item.path)
                                        ? 'bg-sky-600 text-white'
                                        : 'text-sky-100 hover:bg-sky-600 hover:text-white'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default TopNav;
