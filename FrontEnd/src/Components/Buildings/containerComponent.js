import React from 'react';
import { useParams } from 'react-router-dom';
import BuildingVisualization from './Building2D';

const BuildingVisualizationPage = () => {
  const { buildingId } = useParams();
  
  return (
    <>
      <BuildingVisualization buildingId={buildingId} />
    </>
  );
};

export default BuildingVisualizationPage;