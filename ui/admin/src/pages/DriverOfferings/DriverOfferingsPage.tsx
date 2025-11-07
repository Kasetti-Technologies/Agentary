// ui/admin/src/pages/DriverOfferings/DriverOfferingsPage.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient'; // Assuming your API client is here
import DriverListTable from './components/DriverListTable'; // <-- FIXED THIS LINE

// Define the structure of a Driver object
export interface Driver {
    driver_id: string;
    name: string;
    vendor: string;
    supported_services: string[];
    base_monthly_price_cents: number;
    currency: string;
    status: 'draft' | 'published' | 'deprecated';
}

export const DriverOfferingsPage: React.FC = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                // Make the API call to the backend route you created
                const response = await apiClient.get<Driver[]>('/admin/drivers');
                // Set the state with the data from the response
                setDrivers(response.data); // <-- FIXED THIS LINE
            } catch (err) {
                setError('Failed to fetch drivers. Please try again later.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDrivers();
    }, []); // The empty array ensures this runs only once when the component mounts

    if (isLoading) {
        return <div>Loading drivers...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div>
            <h1>Driver Offerings</h1>
            <p>Manage, publish, and monitor all available driver versions.</p>
            <DriverListTable drivers={drivers} />
        </div>
    );
};
