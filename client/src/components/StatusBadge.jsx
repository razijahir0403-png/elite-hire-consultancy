import React from 'react';
import { getStatusBadgeClass, getStatusLabel } from '../utils/statusMaster';
import { getClientStatusBadgeClass, getClientStatusLabel } from '../utils/clientStatusMaster';

const StatusBadge = ({ status, type = 'recruitment', className = '' }) => {
  const label =
    type === 'client' ? getClientStatusLabel(status) : getStatusLabel(type, status);
  const colorClass =
    type === 'client' ? getClientStatusBadgeClass(status) : getStatusBadgeClass(type, status);

  return (
    <span
      className={`px-2 py-0.5 border text-[10px] rounded-lg font-bold inline-block ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
