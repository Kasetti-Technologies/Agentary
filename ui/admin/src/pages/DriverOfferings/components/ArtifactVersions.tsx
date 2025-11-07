    // ui/admin/src/pages/DriverOfferings/components/ArtifactVersions.tsx
    import React, { useState, useEffect } from 'react';
    import apiClient from '../../../api/apiClient';

    interface Artifact {
      artifact_id: string;
      version: string;
      status: 'uploaded' | 'verified' | 'staged' | 'published' | 'deprecated';
      uploaded_at: string;
    }

    interface Props {
      driverId: string;
    }

    export const ArtifactVersions: React.FC<Props> = ({ driverId }) => {
      const [artifacts, setArtifacts] = useState<Artifact[]>([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      // This function fetches artifacts and can be called to refresh the list
      const fetchArtifacts = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await apiClient.get<Artifact[]>(`/admin/drivers/${driverId}/artifacts`);
          setArtifacts(response.data);
        } catch (err) {
          setError('Failed to load artifact versions.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      // Fetch artifacts when the component first mounts
      useEffect(() => {
        fetchArtifacts();
      }, [driverId]);

      const handlePublish = async (artifactId: string) => {
        if (!window.confirm('Are you sure you want to publish this artifact version?')) {
          return;
        }

        try {
          await apiClient.post(`/admin/artifacts/${artifactId}/publish`);
          alert('Artifact published successfully!');
          fetchArtifacts(); // Refresh the list to show the new status
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
          alert(`Failed to publish artifact: ${errorMessage}`);
        }
      };

      if (isLoading) return <div>Loading artifact versions...</div>;
      if (error) return <div style={{ color: 'red', padding: '1em' }}>{error}</div>;

      return (
        <div style={{ padding: '1em', backgroundColor: '#f9f9f9', border: '1px solid #eee' }}>
          <h4>Artifact Versions for Driver {driverId}</h4>
          {artifacts.length === 0 ? (
            <p>No artifacts found for this driver.</p>
          ) : (
            <ul>
              {artifacts.map(art => (
                <li key={art.artifact_id}>
                  Version: <strong>{art.version}</strong> |
                  Status: <strong>{art.status}</strong> |
                  Uploaded: {new Date(art.uploaded_at).toLocaleString()}
                  {/* Only show the publish button if the artifact is in a publishable state */}
                  {['verified', 'staged'].includes(art.status) && (
                    <button onClick={() => handlePublish(art.artifact_id)} style={{ marginLeft: '1em' }}>
                      Publish
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    };
   