import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportsAPI, stockOutAPI } from '../../services/api';

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState({
        stockStatus: null,
        recentStockOut: [],
        lowStockItems: [],
        loading: true
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [stockStatusResponse, stockOutResponse] = await Promise.all([
                reportsAPI.getStockStatus(),
                stockOutAPI.getAll()
            ]);

            const stockStatus = stockStatusResponse.data.success ? stockStatusResponse.data.data : null;
            const recentStockOut = stockOutResponse.data.success ?
                stockOutResponse.data.data.slice(0, 5) : [];

            setDashboardData({
                stockStatus,
                recentStockOut,
                lowStockItems: stockStatus?.lowStockItems || [],
                loading: false
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setDashboardData(prev => ({ ...prev, loading: false }));
        }
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return 'RWF 0';
        }
        return new Intl.NumberFormat('en-RW', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(parseFloat(amount));
    };

    const formatNumber = (number) => {
        return new Intl.NumberFormat('en-US').format(number);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (dashboardData.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            </div>
        );
    }

    const { stockStatus, recentStockOut } = dashboardData;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Overview of your inventory management system</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-gradient-to-r from-sky-500 to-sky-600 text-white">
                    <div>
                        <p className="text-sky-100">Total Parts</p>
                        <p className="text-2xl font-bold">{formatNumber(stockStatus?.summary?.totalParts || 0)}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-r from-sky-600 to-sky-700 text-white">
                    <div>
                        <p className="text-sky-100">Total Quantity</p>
                        <p className="text-2xl font-bold">{formatNumber(stockStatus?.summary?.totalCurrentQuantity || 0)}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-r from-sky-700 to-sky-800 text-white">
                    <div>
                        <p className="text-sky-100">Total Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(stockStatus?.summary?.totalCurrentValue || 0)}</p>
                    </div>
                </div>

                <div className="card bg-gradient-to-r from-sky-800 to-gray-900 text-white">
                    <div>
                        <p className="text-sky-100">Low Stock</p>
                        <p className="text-2xl font-bold">{stockStatus?.summary?.lowStockItemsCount || 0}</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col space-y-6">
                {/* Recent Stock Out */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Recent Stock Out</h2>
                        <Link to="/stock-out" className="text-sky-700 hover:text-sky-800 text-sm">
                            View All
                        </Link>
                    </div>

                    {recentStockOut.length > 0 ? (
                        <div className="space-y-3">
                            {recentStockOut.map((item) => (
                                <div key={item.StockOutID} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{item.SparePartName}</p>
                                        <p className="text-sm text-gray-600">Qty: {item.StockOutQuantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">{formatCurrency(item.StockOutTotalPrice)}</p>
                                        <p className="text-sm text-gray-600">{formatDate(item.StockOutDate)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No recent stock out records</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
