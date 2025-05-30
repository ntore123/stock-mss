import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { exportToCSV } from '../../utils/formatters';

const ReportsManagement = () => {
    const [activeTab, setActiveTab] = useState('daily-stock-out');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Daily Stock Out Report State
    const [dailyStockOutReport, setDailyStockOutReport] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Stock Status Report State
    const [stockStatusReport, setStockStatusReport] = useState(null);

    useEffect(() => {
        if (activeTab === 'daily-stock-out') {
            fetchDailyStockOutReport();
        } else if (activeTab === 'stock-status') {
            fetchStockStatusReport();
        }
    }, [activeTab, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchDailyStockOutReport = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await reportsAPI.getDailyStockOut(selectedDate);
            if (response.data.success) {
                setDailyStockOutReport(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching daily stock out report:', error);
            setError('Failed to fetch daily stock out report');
        } finally {
            setLoading(false);
        }
    };

    const fetchStockStatusReport = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await reportsAPI.getStockStatus();
            if (response.data.success) {
                setStockStatusReport(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stock status report:', error);
            setError('Failed to fetch stock status report');
        } finally {
            setLoading(false);
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const printReport = () => {
        const printWindow = window.open('', '_blank');
        const printContent = activeTab === 'daily-stock-out' 
            ? getDailyStockOutPrintContent()
            : getStockStatusPrintContent();

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${activeTab === 'daily-stock-out' ? 'Daily Stock Out Report' : 'Stock Status Report'}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20mm;
                        color: #333;
                    }
                    .report-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .report-title {
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .report-date {
                        font-size: 16px;
                        color: #666;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 40px;
                    }
                    th, td {
                        border: 1px solid #999;
                        padding: 8px;
                        text-align: left;
                        font-size: 12px;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                        text-transform: uppercase;
                    }
                    .signature-section {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                    }
                    .signature-box {
                        width: 200px;
                        text-align: center;
                    }
                    .signature-box p {
                        margin-bottom: 40px;
                        font-weight: bold;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        margin-top: 20px;
                    }
                    .no-records {
                        text-align: center;
                        font-size: 16px;
                        color: #666;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const getDailyStockOutPrintContent = () => {
        if (!dailyStockOutReport || dailyStockOutReport.records.length === 0) {
            return `
                <div className="report-header">
                    <h1 className="report-title">Daily Stock Out Report</h1>
                    <p className="report-date">${formatDate(selectedDate)}</p>
                </div>
                <div className="no-records">
                    <p>No stock out records found for ${formatDate(selectedDate)}</p>
                </div>
                <div className="signature-section">
                    <div className="signature-box">
                        <p>Prepared By:</p>
                        <div className="signature-line"></div>
                    </div>
                    <div className="signature-box">
                        <p>Approved By:</p>
                        <div className="signature-line"></div>
                    </div>
                </div>
            `;
        }

        return `
            <div className="report-header">
                <h1 className="report-title">Daily Stock Out Report</h1>
                <p className="report-date">${formatDate(dailyStockOutReport.reportDate)}</p>
            </div>
            <table>
                <thead className="bg-sky-600 text-white">
                    <tr>
                        <th>ID</th>
                        <th>Spare Part</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${dailyStockOutReport.records.map(record => `
                        <tr>
                            <td>#${record.StockOutID}</td>
                            <td>${record.SparePartName}</td>
                            <td>-${record.StockOutQuantity}</td>
                            <td>${formatCurrency(record.StockOutUnitPrice)}</td>
                            <td>${formatCurrency(record.StockOutTotalPrice)}</td>
                            <td>${formatDate(record.StockOutDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div className="signature-section">
                <div className="signature-box">
                    <p>Prepared By:</p>
                    <div className="signature-line"></div>
                </div>
                <div className="signature-box">
                    <p>Approved By:</p>
                    <div className="signature-line"></div>
                </div>
            </div>
        `;
    };

    const getStockStatusPrintContent = () => {
        if (!stockStatusReport || stockStatusReport.sparePartStatus.length === 0) {
            return `
                <div className="report-header">
                    <h1 className="report-title">Stock Status Report</h1>
                    <p className="report-date">${formatDate(new Date())}</p>
                </div>
                <div className="no-records">
                    <p>No stock status records found</p>
                </div>
                <div className="signature-section">
                    <div className="signature-box">
                        <p>Prepared By:</p>
                        <div className="signature-line"></div>
                    </div>
                    <div className="signature-box">
                        <p>Approved By:</p>
                        <div className="signature-line"></div>
                    </div>
                </div>
            `;
        }

        return `
            <div className="report-header">
                <h1 className="report-title">Stock Status Report</h1>
                <p className="report-date">${formatDate(new Date())}</p>
            </div>
            <table>
                <thead className="bg-sky-600 text-white">
                    <tr>
                        <th>Spare Part Name</th>
                        <th>Category</th>
                        <th>Stock In</th>
                        <th>Stock Out</th>
                        <th>Current Qty</th>
                        <th>Unit Price</th>
                        <th>Total Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${stockStatusReport.sparePartStatus.map(part => `
                        <tr>
                            <td>${part.SparePartName}</td>
                            <td>${part.Category}</td>
                            <td>+${part.TotalStockIn || 0}</td>
                            <td>-${part.TotalStockOut || 0}</td>
                            <td>${part.CurrentQuantity}</td>
                            <td>${formatCurrency(part.UnitPrice)}</td>
                            <td>${formatCurrency(part.TotalPrice)}</td>
                            <td>${part.CurrentQuantity < 10 ? 'Low Stock' : part.CurrentQuantity < 20 ? 'Medium' : 'In Stock'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div className="signature-section">
                <div className="signature-box">
                    <p>Prepared By:</p>
                    <div className="signature-line"></div>
                </div>
                <div className="signature-box">
                    <p>Approved By:</p>
                    <div className="signature-line"></div>
                </div>
            </div>
        `;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports Management</h1>
                    <p className="text-gray-600">Generate and view inventory reports</p>
                </div>
                <div className="flex space-x-4">
                    <button
                        onClick={printReport}
                        className="btn-secondary"
                    >
                        Print Report
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === 'daily-stock-out' && dailyStockOutReport && dailyStockOutReport.records.length > 0) {
                                exportToCSV(dailyStockOutReport.records, `daily-stock-out-report-${selectedDate}.csv`);
                            } else if (activeTab === 'stock-status' && stockStatusReport && stockStatusReport.sparePartStatus.length > 0) {
                                exportToCSV(stockStatusReport.sparePartStatus, `stock-status-report-${new Date().toISOString().split('T')[0]}.csv`);
                            }
                        }}
                        className="btn-primary"
                    >
                        Export to CSV
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('daily-stock-out')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'daily-stock-out'
                                ? 'border-sky-700 text-sky-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Daily Stock Out Report
                    </button>
                    <button
                        onClick={() => setActiveTab('stock-status')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'stock-status'
                                ? 'border-sky-700 text-sky-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Stock Status Report
                    </button>
                </nav>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-700"></div>
                </div>
            )}

            {/* Daily Stock Out Report */}
            {activeTab === 'daily-stock-out' && !loading && (
                <div className="space-y-6">
                    {/* Date Filter */}
                    <div className="card">
                        <div className="flex items-center space-x-4">
                            <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">
                                Select Date:
                            </label>
                            <input
                                type="date"
                                id="reportDate"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="input-field max-w-xs"
                            />
                            <button
                                onClick={fetchDailyStockOutReport}
                                className="btn-primary"
                            >
                                Generate Report
                            </button>
                        </div>
                    </div>

                    {dailyStockOutReport && (
                        <>
                            {/* Report Details */}
                            <div className="card">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Daily Stock Out Report - {formatDate(dailyStockOutReport.reportDate)}
                                    </h2>
                                </div>

                                {dailyStockOutReport.records.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p className="text-lg font-medium">No stock out records found</p>
                                        <p>No records found for {formatDate(selectedDate)}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-sky-600 text-white">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        ID
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        Spare Part
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        Quantity
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        Unit Price
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        Total Price
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {dailyStockOutReport.records.map((record) => (
                                                    <tr key={record.StockOutID} className="table-row">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            #{record.StockOutID}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="font-medium text-gray-900">{record.SparePartName}</div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                -{record.StockOutQuantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatCurrency(record.StockOutUnitPrice)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {formatCurrency(record.StockOutTotalPrice)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatDate(record.StockOutDate)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Stock Status Report */}
            {activeTab === 'stock-status' && !loading && stockStatusReport && (
                <div className="space-y-6">
                    {/* Stock Status Details */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Current Stock Status
                            </h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-sky-600 text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Spare Part Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Stock In
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Stock Out
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Current Qty
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Unit Price
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Total Value
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stockStatusReport.sparePartStatus.map((part) => (
                                        <tr key={part.SparePartName} className="table-row">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{part.SparePartName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {part.Category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                                    +{part.TotalStockIn || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    -{part.TotalStockOut || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                {part.CurrentQuantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(part.UnitPrice)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatCurrency(part.TotalPrice)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    part.CurrentQuantity < 10
                                                        ? 'bg-red-100 text-red-800'
                                                        : part.CurrentQuantity < 20
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-sky-100 text-sky-800'
                                                }`}>
                                                    {part.CurrentQuantity < 10 ? 'Low Stock' : part.CurrentQuantity < 20 ? 'Medium' : 'In Stock'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsManagement;