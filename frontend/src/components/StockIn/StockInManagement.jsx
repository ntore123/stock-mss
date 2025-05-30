import React, { useState, useEffect } from 'react';
import { stockInAPI, sparePartsAPI } from '../../services/api';

const StockInManagement = () => {
    const [stockInRecords, setStockInRecords] = useState([]);
    const [spareParts, setSpareParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        sparePartName: '',
        stockInQuantity: '',
        stockInDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stockInResponse, sparePartsResponse] = await Promise.all([
                stockInAPI.getAll(),
                sparePartsAPI.getAll()
            ]);

            if (stockInResponse.data.success) {
                setStockInRecords(stockInResponse.data.data);
            }
            if (sparePartsResponse.data.success) {
                setSpareParts(sparePartsResponse.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.sparePartName || !formData.stockInQuantity || !formData.stockInDate) {
            setError('All fields are required');
            return;
        }

        if (parseInt(formData.stockInQuantity) <= 0) {
            setError('Stock in quantity must be positive');
            return;
        }

        try {
            const response = await stockInAPI.create({
                sparePartName: formData.sparePartName,
                stockInQuantity: parseInt(formData.stockInQuantity),
                stockInDate: formData.stockInDate
            });

            if (response.data.success) {
                setSuccess('Stock in record added successfully!');
                setFormData({
                    sparePartName: '',
                    stockInQuantity: '',
                    stockInDate: new Date().toISOString().split('T')[0]
                });
                setShowForm(false);
                fetchData(); // Refresh the data
            }
        } catch (error) {
            console.error('Error adding stock in record:', error);
            setError(error.response?.data?.error || 'Failed to add stock in record');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Stock In Management</h1>
                    <p className="text-gray-600">Record incoming spare parts inventory</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary"
                >
                    {showForm ? 'Cancel' : 'Add Stock In Record'}
                </button>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-sky-100 border border-sky-400 text-sky-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Add Stock In Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Stock In Record</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="sparePartName" className="block text-sm font-medium text-gray-700 mb-1">
                                    Spare Part *
                                </label>
                                <select
                                    id="sparePartName"
                                    name="sparePartName"
                                    value={formData.sparePartName}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Select spare part</option>
                                    {spareParts.map((part) => (
                                        <option key={part.Name} value={part.Name}>
                                            {part.Name} ({part.Category})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="stockInQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    id="stockInQuantity"
                                    name="stockInQuantity"
                                    value={formData.stockInQuantity}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter quantity"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="stockInDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    id="stockInDate"
                                    name="stockInDate"
                                    value={formData.stockInDate}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <button type="submit" className="btn-primary">
                                Add Stock In Record
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stock In Records List */}
            <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Stock In Records ({stockInRecords.length} records)
                </h2>

                {stockInRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-lg font-medium">No stock in records found</p>
                        <p>Add your first stock in record to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-sky-600 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Spare Part
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Unit Price
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockInRecords.map((record) => (
                                    <tr key={record._id || record.StockInID} className="table-row">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(record.stockInDate || record.StockInDate)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{record.sparePart?.name || record.SparePartName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {record.sparePart?.category || record.Category || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                                +{record.stockInQuantity || record.StockInQuantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.sparePart?.unitPrice ? `RWF ${parseFloat(record.sparePart.unitPrice).toLocaleString()}` : (record.UnitPrice ? `RWF ${parseFloat(record.UnitPrice).toLocaleString()}` : 'N/A')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default StockInManagement;
