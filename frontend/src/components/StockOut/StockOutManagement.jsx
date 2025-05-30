import React, { useState, useEffect } from 'react';
import { stockOutAPI, sparePartsAPI } from '../../services/api';

const StockOutManagement = () => {
    const [stockOutRecords, setStockOutRecords] = useState([]);
    const [spareParts, setSpareParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({
        sparePartName: '',
        stockOutQuantity: '',
        stockOutUnitPrice: '',
        stockOutDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stockOutResponse, sparePartsResponse] = await Promise.all([
                stockOutAPI.getAll(),
                sparePartsAPI.getAll()
            ]);

            if (stockOutResponse.data.success) {
                setStockOutRecords(stockOutResponse.data.data);
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

    const resetForm = () => {
        setFormData({
            sparePartName: '',
            stockOutQuantity: '',
            stockOutUnitPrice: '',
            stockOutDate: new Date().toISOString().split('T')[0]
        });
        setEditingRecord(null);
        setShowForm(false);
        setError('');
        setSuccess('');
    };

    // INSERT Operation
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!formData.sparePartName || !formData.stockOutQuantity || !formData.stockOutUnitPrice || !formData.stockOutDate) {
            setError('All fields are required');
            return;
        }

        if (parseInt(formData.stockOutQuantity) <= 0 || parseFloat(formData.stockOutUnitPrice) < 0) {
            setError('Quantity must be positive and unit price must be non-negative');
            return;
        }

        try {
            let response;
            if (editingRecord) {
                // UPDATE Operation
                response = await stockOutAPI.update(editingRecord.StockOutID, {
                    stockOutQuantity: parseInt(formData.stockOutQuantity),
                    stockOutUnitPrice: parseFloat(formData.stockOutUnitPrice),
                    stockOutDate: formData.stockOutDate
                });
                setSuccess('Stock out record updated successfully!');
            } else {
                // INSERT Operation
                response = await stockOutAPI.create({
                    sparePartName: formData.sparePartName,
                    stockOutQuantity: parseInt(formData.stockOutQuantity),
                    stockOutUnitPrice: parseFloat(formData.stockOutUnitPrice),
                    stockOutDate: formData.stockOutDate
                });
                setSuccess('Stock out record added successfully!');
            }

            if (response.data.success) {
                resetForm();
                fetchData(); // Refresh the data
            }
        } catch (error) {
            console.error('Error saving stock out record:', error);
            setError(error.response?.data?.error || 'Failed to save stock out record');
        }
    };

    // RETRIEVE Operation (Edit)
    const handleEdit = (record) => {
        setEditingRecord(record);
        setFormData({
            sparePartName: record.SparePartName,
            stockOutQuantity: record.StockOutQuantity.toString(),
            stockOutUnitPrice: record.StockOutUnitPrice.toString(),
            stockOutDate: record.StockOutDate.split('T')[0]
        });
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    // DELETE Operation
    const handleDelete = async (recordId) => {
        if (!window.confirm('Are you sure you want to delete this stock out record?')) {
            return;
        }

        try {
            const response = await stockOutAPI.delete(recordId);
            if (response.data.success) {
                setSuccess('Stock out record deleted successfully!');
                fetchData(); // Refresh the data
            }
        } catch (error) {
            console.error('Error deleting stock out record:', error);
            setError(error.response?.data?.error || 'Failed to delete stock out record');
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Stock Out Management</h1>
                    <p className="text-gray-600">Manage outgoing spare parts with full CRUD operations</p>
                </div>
                <button
                    onClick={() => {
                        if (showForm) {
                            resetForm();
                        } else {
                            setShowForm(true);
                        }
                    }}
                    className="btn-primary"
                >
                    {showForm ? 'Cancel' : 'Add Stock Out Record'}
                </button>
            </div>

            {/* Success/Error Messages */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Add/Edit Stock Out Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {editingRecord ? 'Edit Stock Out Record' : 'Add Stock Out Record'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    disabled={editingRecord} // Can't change spare part when editing
                                >
                                    <option value="">Select spare part</option>
                                    {spareParts.map((part) => (
                                        <option key={part.Name} value={part.Name}>
                                            {part.Name} (Available: {part.Quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="stockOutQuantity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    id="stockOutQuantity"
                                    name="stockOutQuantity"
                                    value={formData.stockOutQuantity}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter quantity"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="stockOutUnitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Price (RWF) *
                                </label>
                                <input
                                    type="number"
                                    id="stockOutUnitPrice"
                                    name="stockOutUnitPrice"
                                    value={formData.stockOutUnitPrice}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter unit price"
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="stockOutDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    id="stockOutDate"
                                    name="stockOutDate"
                                    value={formData.stockOutDate}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <button type="submit" className="btn-primary">
                                {editingRecord ? 'Update Record' : 'Add Record'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stock Out Records List */}
            <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Stock Out Records ({stockOutRecords.length} records)
                </h2>

                {stockOutRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-lg font-medium">No stock out records found</p>
                        <p>Add your first stock out record to get started.</p>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockOutRecords.map((record) => (
                                    <tr key={record.StockOutID} className="table-row">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            #{record.StockOutID}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{record.SparePartName}</div>
                                            <div className="text-sm text-gray-500">{record.Category || 'N/A'}</div>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => handleEdit(record)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.StockOutID)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
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

export default StockOutManagement;
