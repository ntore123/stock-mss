import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';

const Footer = () => {
    const [stockInfo, setStockInfo] = useState({
        totalParts: 0,
        totalCurrentQuantity: 0,
        totalCurrentValue: 0,
        lowStockItemsCount: 0,
        loading: true
    });

    useEffect(() => {
        fetchStockInfo();
        // Refresh stock info every 30 seconds
        const interval = setInterval(fetchStockInfo, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStockInfo = async () => {
        try {
            const response = await reportsAPI.getStockStatus();
            if (response.data.success) {
                setStockInfo({
                    ...response.data.data.summary,
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching stock info:', error);
            setStockInfo(prev => ({ ...prev, loading: false }));
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

    if (stockInfo.loading) {
        return (
            <footer className="bg-sky-700 text-white py-3">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center">
                        <div className="text-sm text-sky-200">Loading stock information...</div>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-sky-700 text-white py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap justify-between items-center text-sm">
                    {/* Stock Summary */}
                    <div className="flex flex-wrap items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <span className="text-sky-200">Total Parts:</span>
                            <span className="font-medium">{formatNumber(stockInfo.totalParts)}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <span className="text-sky-200">Total Quantity:</span>
                            <span className="font-medium">{formatNumber(stockInfo.totalCurrentQuantity)}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <span className="text-sky-200">Total Value:</span>
                            <span className="font-medium">{formatCurrency(stockInfo.totalCurrentValue)}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <span className="text-sky-200">Low Stock:</span>
                            <span className={`font-medium ${stockInfo.lowStockItemsCount > 0 ? 'text-yellow-300' : 'text-sky-300'}`}>
                                {stockInfo.lowStockItemsCount} items
                            </span>
                        </div>
                    </div>

                    {/* Company Info */}
                    <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                        <div className="text-sky-200">
                            © 2025 SmartPark SIMS
                        </div>
                        <div className="text-xs text-sky-300">
                            Last updated: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
