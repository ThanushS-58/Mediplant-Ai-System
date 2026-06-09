
import React from 'react';

export const LeafIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 20A7 7 0 0 1 4 13H2a10 10 0 0 0 10 10z" />
    <path d="M12 21a10 10 0 0 0 10-10h-2a7 7 0 0 1-7 7z" />
    <path d="M12 4v17" />
    <path d="M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
  </svg>
);
