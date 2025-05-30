import React, { useState, useEffect } from 'react';
import { sparePartsAPI } from '../../services/api';

const SparePartsManagement = () => {
    const [spareParts, setSpareParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        quantity: '',
        unitPrice: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchSpareParts();
    }, []);

    const fetchSpareParts = async () => {
        try {
            const response = await sparePartsAPI.getAll();
            if (response.data.success) {
                setSpareParts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching spare parts:', error);
            setError('Failed to fetch spare parts');
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
        if (!formData.name || !formData.category || !formData.quantity || !formData.unitPrice) {
            setError('All fields are required');
            return;
        }

        if (parseFloat(formData.quantity) < 0 || parseFloat(formData.unitPrice) < 0) {
            setError('Quantity and unit price must be non-negative');
            return;
        }

        try {
            const response = await sparePartsAPI.create({
                name: formData.name,
                category: formData.category,
                quantity: parseInt(formData.quantity),
                unitPrice: parseFloat(formData.unitPrice)
            });

            if (response.data.success) {
                setSuccess('Spare part added successfully!');
                setFormData({ name: '', category: '', quantity: '', unitPrice: '' });
                setShowForm(false);
                fetchSpareParts(); // Refresh the list
            }
        } catch (error) {
            console.error('Error adding spare part:', error);
            setError(error.response?.data?.error || 'Failed to add spare part');
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
                    <h1 className="text-3xl font-bold text-gray-900">Spare Parts Management</h1>
                    <p className="text-gray-600">Manage your spare parts inventory</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn-primary"
                >
                    {showForm ? 'Cancel' : 'Add New Spare Part'}
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

            {/* Add Spare Part Form */}
            {showForm && (
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Spare Part</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Spare Part Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter spare part name"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category *
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Select category</option>
                                    <option value="Engine">Engine</option>
                                    <option value="Brakes">Brakes</option>
                                    <option value="Transmission">Transmission</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Suspension">Suspension</option>
                                    <option value="Body">Body</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                    Initial Quantity *
                                </label>
                                <input
                                    type="number"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter quantity"
                                    min="0"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Price (RWF) *
                                </label>
                                <input
                                    type="number"
                                    id="unitPrice"
                                    name="unitPrice"
                                    value={formData.unitPrice}
                                    onChange={handleInputChange}
                                    className="input-field"
                                    placeholder="Enter unit price"
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <button type="submit" className="btn-primary">
                                Add Spare Part
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

            {/* Spare Parts List */}
            <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Spare Parts Inventory ({spareParts.length} items)
                </h2>

                {spareParts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-lg font-medium">No spare parts found</p>
                        <p>Add your first spare part to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-sky-600 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Name
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
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Total Value
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {spareParts.map((part) => (
                                    <tr key={part.Name} className="table-row">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{part.Name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {part.Category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                            {part.Quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                            {formatCurrency(part.UnitPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                            {formatCurrency(part.TotalPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                part.Quantity < 10
                                                    ? 'bg-red-100 text-red-800'
                                                    : part.Quantity < 20
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}>
                                                {part.Quantity < 10 ? 'Low Stock' : part.Quantity < 20 ? 'Medium' : 'In Stock'}
                                            </span>
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

export default SparePartsManagement;
