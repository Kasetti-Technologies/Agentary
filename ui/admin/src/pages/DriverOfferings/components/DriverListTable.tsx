// ui/admin/src/pages/DriverOfferings/components/DriverListTable.tsx
import React, { useState } from 'react';
import { Driver } from '../DriverOfferingsPage';
import { ArtifactVersions } from './ArtifactVersions';

interface DriverListTableProps {
  drivers: Driver[];
}

export const DriverListTable: React.FC<DriverListTableProps> = ({ drivers }) => {
  // State to track which driver's artifacts are being viewed
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const toggleArtifactsView = (driverId: string) => {
    // If the same driver is clicked again, hide the artifacts. Otherwise, show them.
    setSelectedDriverId(prevId => (prevId === driverId ? null : driverId));
  };

  if (!drivers || drivers.length === 0) {
    return <p>No drivers found.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #ccc' }}>
          <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
          <th style={{ textAlign: 'left', padding: '8px' }}>Vendor</th>
          <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
          <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {drivers.map((driver) => (
          // Use React.Fragment to group the row and its potential artifacts
          <React.Fragment key={driver.driver_id}>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{driver.name}</td>
              <td style={{ padding: '8px' }}>{driver.vendor}</td>
              <td style={{ padding: '8px' }}>{driver.status}</td>
              <td style={{ padding: '8px' }}>
                <button onClick={() => toggleArtifactsView(driver.driver_id)}>
                  {selectedDriverId === driver.driver_id ? 'Hide Artifacts' : 'View Artifacts'}
                </button>
              </td>
            </tr>
            {/* If this driver is selected, render the ArtifactVersions component below its row */}
            {selectedDriverId === driver.driver_id && (
              <tr>
                <td colSpan={4}>
                  <ArtifactVersions driverId={driver.driver_id} />
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

export default DriverListTable;
