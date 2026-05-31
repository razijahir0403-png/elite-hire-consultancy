import React from 'react';
import { getStatusBadgeClass, getStatusLabel } from '../utils/statusMaster';
import { getClientStatusBadgeClass, getClientStatusLabel } from '../utils/clientStatusMaster';

const StatusBadge = ({ status, type = 'recruitment', className = '' }) => {
  const code = Number(status);
  const label =
    type === 'client' ? getClientStatusLabel(code) : getStatusLabel(type, code);
  const colorClass =
    type === 'client' ? getClientStatusBadgeClass(code) : getStatusBadgeClass(type, code);

  return (
    <span
      className={`px-2 py-0.5 border text-[10px] rounded-lg font-bold inline-block ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
