import React from 'react';
import { getStatusBadgeClass, getStatusLabel } from '../utils/statusMaster';

const StatusBadge = ({ status, type = 'recruitment', className = '' }) => {
  const code = Number(status);
  const label = getStatusLabel(type, code);
  const colorClass = getStatusBadgeClass(type, code);

  return (
    <span
      className={`px-2 py-0.5 border text-[10px] rounded-lg font-bold inline-block ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
